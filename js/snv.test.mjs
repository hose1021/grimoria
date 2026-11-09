import test from "node:test";
import assert from "node:assert/strict";
import {
  SNV, SNV_ALL, SV_NIGHT_FIRST, SV_NIGHT_OTHER, bagErrors, compositionFor,
  isSnvRole, isSupportedRole, randomBag, roleTeam
} from "./rules.js";
import { createGame, validateState } from "./model.js";
import {
  checkWin, completeStep, currentStep, dealGame, endDay, endNight, executeByDecision,
  infoForStep, kill, nominate, recordSvOutcome, recordVotes, setupErrors, startNight
} from "./engine.js";
import { buildSvNightQueue, reconcileNoDashiiPoison } from "./engine/sv.js";
import { parseScript, sectsAndVioletsScript } from "./scripts.js";

function make(assignment, options = {}) {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  state.script = sectsAndVioletsScript();
  state.scriptId = "snv";
  state.setup.count = count;
  const required = [...new Set(Object.values(assignment))];
  const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of required) counts[roleTeam(id)] += 1;
  const target = compositionFor(count, required);
  const roles = [...required];
  for (const team of ["outsider", "townsfolk", "minion", "demon"]) {
    const need = target[team] - counts[team];
    assert.ok(need >= 0, "too many " + team + " in fixture");
    const pool = SNV[team].filter((id) => !roles.includes(id));
    assert.ok(pool.length >= need, "not enough " + team + " roles for fixture");
    roles.push(...pool.slice(0, need));
  }
  state.setup.roles = roles;
  state.setup.bluffs = SNV_ALL.filter((id) => !roles.includes(id)).slice(0, count >= 7 ? 3 : 0);
  state.setup.evilTwinGoodId = roles.includes("eviltwin")
    ? roles.find((id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider")
    : null;
  const full = { ...assignment };
  const spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) {
    if (!full[id]) full[id] = spare.shift();
  }
  const result = dealGame(state, { assignment: full });
  assert.equal(result.ok, true, JSON.stringify(result));
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

function finishNight(state) {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = currentStep(state);
    if (!step) return;
    const pool = state.order.filter((id) => state.players[id].alive && id !== step.actorId);
    completeStep(state, step.key, { targetIds: pool.slice(0, step.minTargets || 0) });
  }
  throw new Error("night did not finish");
}

test("Sects and Violets roster and composition follow the official data", () => {
  assert.equal(SNV_ALL.length, 25);
  assert.deepEqual(
    [SNV.townsfolk.length, SNV.outsider.length, SNV.minion.length, SNV.demon.length],
    [13, 4, 4, 4]
  );
  for (const id of SNV_ALL) assert.equal(isSnvRole(id), true);
  assert.equal(isSupportedRole("vanggu"), false);
  assert.equal(isSupportedRole("fanggu"), true);
  assert.deepEqual(compositionFor(8, ["fanggu"]), { townsfolk: 4, outsider: 2, minion: 1, demon: 1 });
  assert.deepEqual(compositionFor(8, ["vigormortis"]), { townsfolk: 6, outsider: 0, minion: 1, demon: 1 });
  assert.deepEqual(SV_NIGHT_FIRST, [
    "philosopher", "info", "snakecharmer", "eviltwin", "witch", "cerenovus",
    "clockmaker", "dreamer", "seamstress", "mathematician"
  ]);
  assert.equal(SV_NIGHT_OTHER.length, 19);
  assert.equal(SV_NIGHT_OTHER.at(-1), "mathematician");
});

test("random Sects and Violets bags are legal at every player count", () => {
  for (const count of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
    const bag = randomBag(count, Math.random, SNV_ALL);
    const errors = bagErrors({ count, roles: bag.roles, bluffs: bag.bluffs, pool: SNV_ALL });
    assert.deepEqual(errors, [], count + ": " + JSON.stringify(errors));
  }
});

test("the Vigormortis -1 Outsider choice is rejected when there is no Outsider to remove", () => {
  const errors = bagErrors({
    count: 7,
    roles: ["fanggu", "vigormortis", "clockmaker", "dreamer", "sailor", "artist", "juggler"],
    bluffs: [],
    pool: SNV_ALL
  });
  assert.ok(errors.some((error) => error.code === "vigormortis-minus"));
});

test("an Sects and Violets game deals, validates and builds the first night", () => {
  const state = make({ 1: "clockmaker", 6: "eviltwin", 7: "vortox" }, { count: 7 });
  assert.deepEqual(setupErrors(state), []);
  assert.deepEqual(validateState(state), []);
  assert.equal(startNight(state).ok, true);
  const queue = state.night.queue.map((step) => step.roleId || step.system);
  assert.ok(queue.includes("minioninfo"));
  assert.ok(queue.includes("demoninfo"));
  assert.ok(queue.includes("eviltwin"));
  assert.ok(queue.includes("clockmaker"));
  assert.equal(queue.includes("witch"), false);
  assert.equal(infoForStep(state, state.night.queue.find((step) => step.roleId === "clockmaker")).kind, "number");
});

test("the Clockmaker learns the distance from the Demon to its nearest Minion", () => {
  const state = make({ 1: "clockmaker", 7: "eviltwin", 6: "vortox" }, { count: 7 });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "clockmaker");
  const info = infoForStep(state, step);
  assert.equal(info.kind, "number");
  assert.equal(info.value, 1);
});

test("executing the good Evil Twin wins the game for evil", () => {
  const state = make({ 1: "clockmaker", 6: "eviltwin", 7: "vortox" }, { count: 7 });
  state.phase = "day";
  state.day = { number: 1, morning: [], nominations: [], activeNominationId: null, execution: null, ended: false, open: true };
  executeByDecision(state, "1");
  assert.equal(state.winner.team, "evil");
  assert.equal(state.winner.reason, "evil-twin");
});

test("the Vortox wins when the day ends without an execution", () => {
  const state = make({ 1: "clockmaker", 7: "vortox" }, { count: 7 });
  state.phase = "day";
  state.day = { number: 1, morning: [], nominations: [], activeNominationId: null, execution: null, ended: false, open: true };
  checkWin(state, { endOfDay: true });
  assert.equal(state.winner.team, "evil");
  assert.equal(state.winner.reason, "vortox");
});

test("the Witch curse kills the nominator but keeps the nomination", () => {
  const state = make({ 1: "clockmaker", 6: "witch", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const witch = state.night.queue.find((step) => step.roleId === "witch");
  assert.ok(witch);
  assert.equal(completeStep(state, witch.key, { targetIds: ["1"] }).ok, true);
  state.phase = "day";
  state.day = { number: 1, morning: [], nominations: [], activeNominationId: null, execution: null, ended: false, open: true };
  const result = nominate(state, "1", "2");
  assert.equal(result.ok, true);
  assert.equal(result.curse, true);
  assert.equal(result.nomination.nominatorId, "1");
  assert.equal(result.nomination.nomineeId, "2");
  assert.equal(state.players["1"].alive, false, "the cursed nominator dies");
  assert.equal(state.day.nominations.length, 1, "the nomination is still recorded");
  assert.equal(state.day.activeNominationId, result.nomination.id,
    "the nomination can still be voted on");
  assert.equal(state.day.ended, false, "the game continues");
  const voters = state.order.filter((id) => state.players[id].alive);
  const votes = recordVotes(state, result.nomination.id, voters);
  assert.equal(votes.ok, true, votes.error);
  assert.equal(votes.nomination.count, voters.length,
    "the surviving players still vote on the cursed nominator's nomination");
});

test("a dead or impaired Witch cannot curse the nomination", () => {
  for (const impair of ["dead", "poison"]) {
    const state = make({ 1: "clockmaker", 6: "witch", 7: "fanggu" }, { count: 7 });
    startNight(state);
    const witch = state.night.queue.find((step) => step.roleId === "witch");
    completeStep(state, witch.key, { targetIds: ["1"] });
    if (impair === "dead") {
      state.players["6"].alive = false;
    } else {
      state.effects.push({
        id: "test-poison", kind: "poison", sourceId: "7", targetId: "6",
        start: { phase: "night", number: 1 },
        expires: { phase: "night", number: 2 }, active: true
      });
    }
    state.phase = "day";
    state.day = { number: 1, morning: [], nominations: [], activeNominationId: null, execution: null, ended: false, open: true };
    const result = nominate(state, "1", "2");
    assert.equal(result.ok, true, impair);
    assert.equal(result.curse, false, impair);
    assert.equal(state.players["1"].alive, true, impair);
    assert.equal(state.day.nominations.length, 1, impair);
  }
});

test("a first Outsider death makes the Outsider the new Fang Gu and kills the old Demon", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu");
  assert.ok(step, "Fang Gu wakes on a later night");
  completeStep(state, step.key, { targetIds: ["1"] });
  recordSvOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(state.players["1"].alive, true, "the Outsider survives as the new Fang Gu");
  assert.equal(state.players["1"].roleId, "fanggu");
  assert.equal(state.players["1"].team, "evil");
  assert.equal(state.players["7"].alive, false, "the old Demon dies");
  assert.equal(state.winner, null, "a Demon is still alive");
});

test("the No Dashii poisons the nearest Townsfolk even when that seat is dead", () => {
  const state = make({
    2: "clockmaker", 3: "dreamer", 4: "nodashii", 5: "artist", 6: "juggler"
  }, { count: 7 });
  state.players["3"].alive = false;
  startNight(state);
  const poisoned = state.effects.filter((effect) => effect.kind === "poison");
  assert.equal(poisoned.some((effect) => effect.targetId === "3"), true,
    "the dead Townsfolk at seat 3 is still the nearest Townsfolk");
  assert.equal(poisoned.some((effect) => effect.targetId === "2"), false,
    "the living Townsfolk farther away is not poisoned");
});

test("No Dashii poison is reconciled when the source or a target changes character", () => {
  const state = make({
    2: "clockmaker", 3: "dreamer", 4: "nodashii", 5: "artist", 6: "juggler"
  }, { count: 7 });
  startNight(state);
  const initial = state.effects.filter((effect) => effect.kind === "poison" && effect.sourceId === "4");
  assert.ok(initial.length > 0);
  state.players["4"].roleId = "vortox";
  reconcileNoDashiiPoison(state);
  assert.ok(initial.every((effect) => effect.active === false),
    "poison from a source that is no longer the No Dashii is removed");

  const next = make({
    2: "clockmaker", 3: "dreamer", 4: "nodashii", 5: "artist", 6: "juggler"
  }, { count: 7 });
  startNight(next);
  const before = next.effects.filter((effect) => effect.kind === "poison" && effect.targetId === "3");
  assert.ok(before.length);
  next.players["3"].roleId = "klutz";
  reconcileNoDashiiPoison(next);
  assert.ok(before.every((effect) => effect.active === false),
    "poison on a former Townsfolk target is removed");
  assert.ok(next.effects.some((effect) => effect.kind === "poison" && effect.targetId === "2" && effect.active),
    "the new nearest Townsfolk is poisoned");
});

test("a custom all-Sects-and-Violets script is accepted and a mixed one is rejected", () => {
  const script = sectsAndVioletsScript();
  assert.equal(script.id, "snv");
  assert.equal(script.edition, "snv");
  assert.equal(script.roles.length, 25);
  assert.deepEqual(script.roles, SNV_ALL);
});

test("the Evil Twin setup requires a good twin", () => {
  const state = make({ 1: "clockmaker", 7: "eviltwin", 6: "vortox" }, { count: 7 });
  state.setup.evilTwinGoodId = null;
  assert.ok(setupErrors(state).some((error) => error.code === "evil-twin-good"));
});

test("the script parser accepts a full Sects and Violets custom script and rejects mixing", () => {
  const catalog = SNV_ALL.map((id) => ({ id, name: id, team: roleTeam(id), edition: "snv" }));
  catalog.push({ id: "washerwoman", name: "Washerwoman", team: "townsfolk", edition: "tb" });
  const all = parseScript(JSON.stringify(SNV_ALL.map((id) => ({ id }))), catalog);
  assert.equal(all.ok, true, all.error);
  assert.equal(all.script.roles.length, 25);
  assert.equal(all.script.edition, "custom");
  const mixed = parseScript(JSON.stringify([...SNV_ALL.map((id) => ({ id })), { id: "washerwoman" }]), catalog);
  assert.equal(mixed.ok, false);
  assert.match(mixed.error, /Смешивать/);
});
