import test from "node:test";
import assert from "node:assert/strict";
import {
  SNV,
  SNV_ALL,
  SV_NIGHT_FIRST,
  SV_NIGHT_OTHER,
  bagErrors,
  compositionFor,
  isSnvRole,
  isSupportedRole,
  randomBag,
  roleTeam,
} from "./rules.js";
import { createGame, exportGame, importGame, setRoster, validateState } from "./model.js";
import {
  applyCommand,
  checkWin,
  completeStep,
  currentStep,
  dealGame,
  endDay,
  endNight,
  executeByDecision,
  infoForStep,
  isImpaired,
  nominate,
  recordSvOutcome,
  recordVotes,
  setupErrors,
  startNight,
} from "./engine.js";
import { reconcileNoDashiiPoison } from "./engine.js";
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
    [13, 4, 4, 4],
  );
  for (const id of SNV_ALL) assert.equal(isSnvRole(id), true);
  assert.equal(isSupportedRole("vanggu"), false);
  assert.equal(isSupportedRole("fanggu"), true);
  assert.deepEqual(compositionFor(8, ["fanggu"]), {
    townsfolk: 4,
    outsider: 2,
    minion: 1,
    demon: 1,
  });
  assert.deepEqual(compositionFor(8, ["vigormortis"]), {
    townsfolk: 6,
    outsider: 0,
    minion: 1,
    demon: 1,
  });
  assert.deepEqual(SV_NIGHT_FIRST, [
    "philosopher",
    "info",
    "snakecharmer",
    "eviltwin",
    "witch",
    "cerenovus",
    "clockmaker",
    "dreamer",
    "seamstress",
    "mathematician",
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
    pool: SNV_ALL,
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
  assert.equal(
    infoForStep(
      state,
      state.night.queue.find((step) => step.roleId === "clockmaker"),
    ).kind,
    "number",
  );
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
  state.day = {
    number: 1,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(state, "1");
  assert.equal(state.winner.team, "evil");
  assert.equal(state.winner.reason, "evil-twin");
});

test("the Vortox wins when the day ends without an execution", () => {
  const state = make({ 1: "clockmaker", 7: "vortox" }, { count: 7 });
  state.phase = "day";
  state.day = {
    number: 1,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
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
  state.day = {
    number: 1,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  const result = nominate(state, "1", "2");
  assert.equal(result.ok, true);
  assert.equal(result.curse, true);
  assert.equal(result.nomination.nominatorId, "1");
  assert.equal(result.nomination.nomineeId, "2");
  assert.equal(state.players["1"].alive, false, "the cursed nominator dies");
  assert.equal(state.day.nominations.length, 1, "the nomination is still recorded");
  assert.equal(
    state.day.activeNominationId,
    result.nomination.id,
    "the nomination can still be voted on",
  );
  assert.equal(state.day.ended, false, "the game continues");
  const voters = state.order.filter((id) => state.players[id].alive);
  const votes = recordVotes(state, result.nomination.id, voters);
  assert.equal(votes.ok, true, votes.error);
  assert.equal(
    votes.nomination.count,
    voters.length,
    "the surviving players still vote on the cursed nominator's nomination",
  );
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
        id: "test-poison",
        kind: "poison",
        sourceId: "7",
        targetId: "6",
        start: { phase: "night", number: 1 },
        expires: { phase: "night", number: 2 },
        active: true,
      });
    }
    state.phase = "day";
    state.day = {
      number: 1,
      morning: [],
      nominations: [],
      activeNominationId: null,
      execution: null,
      ended: false,
      open: true,
    };
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
  const state = make(
    {
      2: "clockmaker",
      3: "dreamer",
      4: "nodashii",
      5: "artist",
      6: "juggler",
    },
    { count: 7 },
  );
  state.players["3"].alive = false;
  startNight(state);
  const poisoned = state.effects.filter((effect) => effect.kind === "poison");
  assert.equal(
    poisoned.some((effect) => effect.targetId === "3"),
    true,
    "the dead Townsfolk at seat 3 is still the nearest Townsfolk",
  );
  assert.equal(
    poisoned.some((effect) => effect.targetId === "2"),
    false,
    "the living Townsfolk farther away is not poisoned",
  );
});

test("No Dashii poison is reconciled when the source or a target changes character", () => {
  const state = make(
    {
      2: "clockmaker",
      3: "dreamer",
      4: "nodashii",
      5: "artist",
      6: "juggler",
    },
    { count: 7 },
  );
  startNight(state);
  const initial = state.effects.filter(
    (effect) => effect.kind === "poison" && effect.sourceId === "4",
  );
  assert.ok(initial.length > 0);
  state.players["4"].roleId = "vortox";
  reconcileNoDashiiPoison(state);
  assert.ok(
    initial.every((effect) => effect.active === false),
    "poison from a source that is no longer the No Dashii is removed",
  );

  const next = make(
    {
      2: "clockmaker",
      3: "dreamer",
      4: "nodashii",
      5: "artist",
      6: "juggler",
    },
    { count: 7 },
  );
  startNight(next);
  const before = next.effects.filter(
    (effect) => effect.kind === "poison" && effect.targetId === "3",
  );
  assert.ok(before.length);
  next.players["3"].roleId = "klutz";
  reconcileNoDashiiPoison(next);
  assert.ok(
    before.every((effect) => effect.active === false),
    "poison on a former Townsfolk target is removed",
  );
  assert.ok(
    next.effects.some(
      (effect) => effect.kind === "poison" && effect.targetId === "2" && effect.active,
    ),
    "the new nearest Townsfolk is poisoned",
  );
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
  const mixed = parseScript(
    JSON.stringify([...SNV_ALL.map((id) => ({ id })), { id: "washerwoman" }]),
    catalog,
  );
  assert.equal(mixed.ok, false);
  assert.match(mixed.error, /Смешивать/);
});

test("the Fang Gu jump can happen only once per game", () => {
  // Wiki r2974: "This can only happen once per game. If the new Fang Gu
  // attacks an Outsider, the Outsider dies as normal." The ONCE reminder
  // stays in the centre even if the Fang Gu dies or changes character.
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const otherOutsider = state.order.find(
    (id) => id !== "1" && roleTeam(state.players[id].roleId) === "outsider",
  );
  assert.ok(otherOutsider, "the +1 Outsider setup puts a second Outsider in play");
  const otherRole = state.players[otherOutsider].roleId;

  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  let step = state.night.queue.find((candidate) => candidate.roleId === "fanggu");
  assert.ok(step, "Fang Gu wakes on a later night");
  completeStep(state, step.key, { targetIds: ["1"] });
  recordSvOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(state.players["1"].roleId, "fanggu");
  assert.equal(state.players["8"].alive, false);

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  step = state.night.queue.find((candidate) => candidate.roleId === "fanggu");
  assert.ok(step, "the new Fang Gu wakes next night");
  assert.equal(step.actorId, "1");
  completeStep(state, step.key, { targetIds: [otherOutsider] });
  recordSvOutcome(state, step.key, { deathIds: [otherOutsider] });

  assert.equal(state.players[otherOutsider].alive, false, "the second Outsider dies as normal");
  assert.equal(
    state.players[otherOutsider].roleId,
    otherRole,
    "no second jump: the Outsider keeps its role",
  );
  assert.equal(state.players["1"].alive, true, "the new Fang Gu survives");
  assert.equal(state.players["1"].roleId, "fanggu");
});

test("redealing starts a fresh game with the Fang Gu limit available", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const assignment = Object.fromEntries(state.order.map((id) => [id, state.players[id].roleId]));
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu");
  completeStep(state, step.key, { targetIds: ["1"] });
  recordSvOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(state.fangguJumped, true);

  const redeal = dealGame(state, { assignment });
  assert.equal(redeal.ok, true, JSON.stringify(redeal));
  assert.equal(state.fangguJumped, false, "a fresh deal clears the ONCE reminder");
  assert.equal(state.players["1"].roleId, "klutz");
  assert.equal(state.players["8"].roleId, "fanggu");
});

test("a save without the game-scoped flag still honours the old Fang Gu marker", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const otherOutsider = state.order.find(
    (id) => id !== "1" && roleTeam(state.players[id].roleId) === "outsider",
  );
  const otherRole = state.players[otherOutsider].roleId;

  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true);
  assert.equal(state.players["8"].used.fanggu, true, "the old code marked the acting Demon");

  // A save written before the game-scoped flag existed has only this marker.
  delete state.fangguJumped;
  assert.deepEqual(validateState(state), []);

  nextNight(state);
  jumpFangGu(state, otherOutsider);

  assert.equal(state.players[otherOutsider].alive, false);
  assert.equal(state.players[otherOutsider].roleId, otherRole, "no second jump from a legacy save");
  assert.equal(state.players["1"].alive, true);
  assert.equal(state.players["1"].roleId, "fanggu");
});

test("setRoster clears the Fang Gu limit and a fresh deal allows one jump", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const assignment = Object.fromEntries(state.order.map((id) => [id, state.players[id].roleId]));
  const roles = state.setup.roles.slice();
  const bluffs = state.setup.bluffs.slice();

  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true);

  setRoster(state, 8);
  assert.equal(state.fangguJumped, false, "setRoster clears the ONCE reminder");
  state.setup.roles = roles;
  state.setup.bluffs = bluffs;
  const redeal = dealGame(state, { assignment });
  assert.equal(redeal.ok, true, JSON.stringify(redeal));

  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true, "a fresh game allows its first jump");
  assert.equal(state.players["1"].roleId, "fanggu");
  assert.equal(state.players["8"].alive, false);
});

test("a bag reset clears the Fang Gu once-per-game limit", async () => {
  const { applyCommand } = await import("./engine.js");
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true);

  const reset = applyCommand(state, {
    id: "reset-bag",
    type: "bagUpdate",
    payload: { patch: { count: 8 } },
  });
  assert.equal(reset.status, "allowed", JSON.stringify(reset));
  assert.equal(state.fangguJumped, false, "the setup reset clears the ONCE reminder");
  assert.equal(state.phase, "setup");
});

test("the Fang Gu limit survives an export and import", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const otherOutsider = state.order.find(
    (id) => id !== "1" && roleTeam(state.players[id].roleId) === "outsider",
  );
  const otherRole = state.players[otherOutsider].roleId;

  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true);

  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, restored.error);
  assert.equal(restored.state.fangguJumped, true, "the ONCE reminder is persisted");

  const next = restored.state;
  nextNight(next);
  jumpFangGu(next, otherOutsider);

  assert.equal(next.players[otherOutsider].alive, false, "the second Outsider dies as normal");
  assert.equal(next.players[otherOutsider].roleId, otherRole);
  assert.equal(next.players["1"].alive, true);
  assert.equal(next.players["1"].roleId, "fanggu");
});

function reachFangGuNight(state) {
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu");
  assert.ok(step, "Fang Gu wakes on a later night");
  return step;
}

function jumpFangGu(state, targetId) {
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu");
  assert.ok(step, "Fang Gu wakes on a later night");
  completeStep(state, step.key, { targetIds: [targetId] });
  recordSvOutcome(state, step.key, { deathIds: [targetId] });
}

function nextNight(state) {
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
}

// ---------------------------------------------------------------------------
// Character and team replacements (Pit-Hag, Barber, Snake Charmer, Philosopher)

function laterNight(state) {
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  return state.night.queue;
}

function stepFor(state, roleId) {
  const step = state.night.queue.find((candidate) => candidate.roleId === roleId);
  assert.ok(step, roleId + " has a night step");
  return step;
}

function runStep(state, id, payload) {
  return applyCommand(state, { id, type: "completeNightStep", payload });
}

function rolesInPlay(state) {
  return Object.values(state.players).map((player) => player.roleId);
}

function assertNoDuplicateCharacters(state) {
  const roles = rolesInPlay(state);
  assert.equal(
    new Set(roles).size,
    roles.length,
    "no duplicate characters: " + JSON.stringify(roles),
  );
}

test("the Pit-Hag replaces a character atomically", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const target = state.order.find(
    (id) => id !== "1" && roleTeam(state.players[id].roleId) === "townsfolk",
  );
  const previous = state.players[target].roleId;
  // An evil character proves that the alignment does not follow the change.
  const roleId = SNV.minion.find((id) => !rolesInPlay(state).includes(id));
  assert.ok(roleId, "an absent Minion role exists");
  state.bluffs = [roleId, ...state.bluffs];

  const result = runStep(state, "pithag-create", { key: step.key, targetIds: [target], roleId });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players[target].roleId, roleId);
  assert.equal(state.players[target].shownRoleId, roleId);
  assert.equal(state.players[target].changedFrom, previous);
  assert.equal(state.players[target].team, "good", "the character changes, the alignment does not");
  assert.equal(state.bluffs.includes(roleId), false, "the new character leaves the bluffs");
  assertNoDuplicateCharacters(state);
  assert.deepEqual(validateState(state), []);
});

test("the Pit-Hag cannot create a character already in play", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const target = "2";
  const previous = state.players[target].roleId;

  const result = runStep(state, "pithag-duplicate", {
    key: step.key,
    targetIds: [target],
    roleId: "clockmaker",
  });
  assert.equal(result.status, "rejected", JSON.stringify(result));
  assert.equal(state.players[target].roleId, previous, "the state is unchanged");
  assert.equal(state.night.queue.find((candidate) => candidate.key === step.key).done, false);
  assertNoDuplicateCharacters(state);
});

test("a Pit-Hag change that removes the Demon wins the game for good", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));

  const result = runStep(state, "pithag-demon", { key: step.key, targetIds: ["7"], roleId });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["7"].roleId, roleId);
  assert.equal(state.winner && state.winner.team, "good");
  assert.equal(state.winner.reason, "demon-dead");
});

test("the Snake Charmer swaps characters and alignments with the chosen Demon", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "snakecharmer");

  const result = runStep(state, "snake-swap", { key: step.key, targetIds: ["7"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["6"].roleId, "fanggu");
  assert.equal(state.players["6"].team, "evil");
  assert.equal(state.players["7"].roleId, "snakecharmer");
  assert.equal(state.players["7"].team, "good");
  const poison = state.effects.find(
    (effect) => effect.kind === "poison" && effect.targetId === "7" && effect.active,
  );
  assert.ok(poison, "the new Snake Charmer is poisoned");
  assert.equal(poison.expires, null, "the poison is permanent");
  assertNoDuplicateCharacters(state);
  const demonStep = state.night.queue.find(
    (candidate) => candidate.roleId === "fanggu" && !candidate.done && !candidate.skipped,
  );
  assert.ok(demonStep, "the new Demon wakes tonight in the Demon slot");
  assert.equal(demonStep.actorId, "6");
  assert.equal(
    state.night.queue.filter(
      (candidate) => candidate.actorId === "7" && !candidate.done && !candidate.skipped,
    ).length,
    0,
    "the new Snake Charmer does not wake again this night",
  );
  assert.deepEqual(validateState(state), []);
});

test("the Snake Charmer leaves a non-Demon target unchanged", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "snakecharmer");
  const beforeTarget = state.players["1"].roleId;
  const beforeActor = state.players["6"].roleId;

  const result = runStep(state, "snake-non-demon", { key: step.key, targetIds: ["1"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].roleId, beforeTarget);
  assert.equal(state.players["6"].roleId, beforeActor);
  assert.equal(
    state.effects.some((effect) => effect.kind === "poison"),
    false,
    "no poison without a swap",
  );
});

test("the Snake Charmer cannot choose a dead player", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "snakecharmer");
  state.players["7"].alive = false;

  const result = runStep(state, "snake-dead", { key: step.key, targetIds: ["7"] });
  assert.equal(result.status, "rejected", JSON.stringify(result));
  assert.equal(state.players["6"].roleId, "snakecharmer");
  assert.equal(state.players["7"].roleId, "fanggu");
  assert.equal(
    state.effects.some((effect) => effect.kind === "poison"),
    false,
    "a dead target cannot be swapped",
  );
  assert.equal(state.night.queue.find((candidate) => candidate.key === step.key).done, false);
});

test("the Snake Charmer's poison outlives the new Demon", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "snakecharmer");
  const result = runStep(state, "snake-permanent-poison", { key: step.key, targetIds: ["7"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(isImpaired(state, "7"), true, "the new Snake Charmer is poisoned");

  state.players["6"].alive = false;
  assert.equal(isImpaired(state, "7"), true, "the poison does not end when the Demon dies");
  assert.deepEqual(validateState(state), []);
});

test("an evil Snake Charmer and the Demon both stay evil", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  state.players["6"].team = "evil";
  const step = stepFor(state, "snakecharmer");

  const result = runStep(state, "snake-evil", { key: step.key, targetIds: ["7"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["6"].roleId, "fanggu");
  assert.equal(state.players["6"].team, "evil");
  assert.equal(state.players["7"].roleId, "snakecharmer");
  assert.equal(state.players["7"].team, "evil");
});

test("the Barber swap exchanges two characters after the Barber dies", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  const pithag = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  const kill = runStep(state, "pithag-barber-death", {
    key: pithag.key,
    targetIds: ["3"],
    roleId,
    deathIds: ["2"],
  });
  assert.equal(kill.status, "allowed", JSON.stringify(kill));
  assert.equal(state.players["2"].alive, false);

  const barber = stepFor(state, "barber");
  const before3 = state.players["3"].roleId;
  const before4 = state.players["4"].roleId;
  const team3 = state.players["3"].team;
  const team4 = state.players["4"].team;
  const result = runStep(state, "barber-swap", { key: barber.key, targetIds: ["3", "4"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["3"].roleId, before4);
  assert.equal(state.players["4"].roleId, before3);
  assert.equal(state.players["3"].team, team3, "a Barber swap does not change alignment");
  assert.equal(state.players["4"].team, team4, "a Barber swap does not change alignment");
  assertNoDuplicateCharacters(state);
  assert.deepEqual(validateState(state), []);
});

test("the Barber rejects another Demon but allows the Demon to swap itself", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  const pithag = stepFor(state, "pithag");
  const created = runStep(state, "pithag-second-demon", {
    key: pithag.key,
    targetIds: ["3"],
    roleId: "vortox",
    deathIds: ["2"],
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  const barber = stepFor(state, "barber");

  const rejected = runStep(state, "barber-two-demons", {
    key: barber.key,
    targetIds: ["3", "8"],
  });
  assert.equal(rejected.status, "rejected", JSON.stringify(rejected));
  assert.equal(state.players["3"].roleId, "vortox");

  const beforeDemon = state.players["3"].roleId;
  const before4 = state.players["4"].roleId;
  const ownSwap = runStep(state, "barber-self", { key: barber.key, targetIds: ["3", "4"] });
  assert.equal(ownSwap.status, "allowed", JSON.stringify(ownSwap));
  assert.equal(state.players["3"].roleId, before4);
  assert.equal(state.players["4"].roleId, beforeDemon);
});

function evilTwinBarberSwap(state) {
  laterNight(state);
  const pithag = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  const kill = runStep(state, "pithag-twin-death", {
    key: pithag.key,
    targetIds: ["3"],
    roleId,
    deathIds: ["2"],
  });
  assert.equal(kill.status, "allowed", JSON.stringify(kill));
  const barber = stepFor(state, "barber");
  const result = runStep(state, "barber-twin-third", {
    key: barber.key,
    targetIds: [state.setup.evilTwinGoodPlayerId, "3"],
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
}

test("the Evil Twin win follows the good twin after a character swap", () => {
  const state = make(
    { 1: "clockmaker", 2: "barber", 6: "eviltwin", 7: "pithag", 11: "fanggu" },
    { count: 11 },
  );
  const goodTwin = state.setup.evilTwinGoodPlayerId;
  const evilTwin = state.setup.evilTwinPlayerId;
  assert.ok(goodTwin && evilTwin, "the deal resolves the pair by player");

  evilTwinBarberSwap(state);
  assert.notEqual(state.players[goodTwin].roleId, "clockmaker");
  assert.equal(state.players["3"].roleId, "clockmaker");

  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(state, goodTwin);
  assert.equal(state.winner && state.winner.reason, "evil-twin");
});

test("inheriting the good twin's character does not move the Evil Twin win", () => {
  const state = make(
    { 1: "clockmaker", 2: "barber", 6: "eviltwin", 7: "pithag", 11: "fanggu" },
    { count: 11 },
  );
  evilTwinBarberSwap(state);
  assert.equal(state.players["3"].roleId, "clockmaker", "the role moved to a third player");

  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(state, "3");
  assert.equal(state.winner, null, "the new role holder is not the good twin");
});

test("the Philosopher gains the chosen ability and drunks its owner", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const step = stepFor(state, "philosopher");

  const result = runStep(state, "philosopher-clockmaker", {
    key: step.key,
    roleId: "clockmaker",
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].used.philosopherAbility, "clockmaker");
  assert.ok(
    state.effects.some(
      (effect) =>
        effect.kind === "drunk" &&
        effect.philosopher === true &&
        effect.targetId === "2" &&
        effect.active,
    ),
    "the owner of the chosen character is drunk",
  );
  const borrowed = state.night.queue.find(
    (candidate) =>
      candidate.roleId === "clockmaker" &&
      candidate.actorId === "1" &&
      !candidate.done &&
      !candidate.skipped,
  );
  assert.ok(borrowed, "the Philosopher wakes with the borrowed ability");
  assertNoDuplicateCharacters(state);
  assert.deepEqual(validateState(state), []);
});

test("an impaired Philosopher spends the ability and gains nothing", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  state.effects.push({
    id: "test-philosopher-poison",
    kind: "poison",
    sourceId: "7",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  });
  const step = stepFor(state, "philosopher");

  const result = runStep(state, "philosopher-impaired", {
    key: step.key,
    roleId: "clockmaker",
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].used.philosopher, true, "the ability is spent");
  assert.equal(state.players["1"].used.philosopherAbility, undefined);
  assert.equal(
    state.effects.some((effect) => effect.philosopher === true),
    false,
  );
  assert.equal(
    state.night.queue.some(
      (candidate) => candidate.roleId === "clockmaker" && candidate.actorId === "1",
    ),
    false,
    "no borrowed ability step",
  );
});

test("the Philosopher can decline and keep the once-per-game ability", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const step = stepFor(state, "philosopher");

  const result = runStep(state, "philosopher-decline", { key: step.key });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].used.philosopher, undefined);
});

test("the Philosopher may choose their own character and becomes drunk", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const step = stepFor(state, "philosopher");

  const result = runStep(state, "philosopher-self", { key: step.key, roleId: "philosopher" });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].used.philosopherAbility, "philosopher");
  assert.ok(
    state.effects.some(
      (effect) =>
        effect.kind === "drunk" &&
        effect.philosopher === true &&
        effect.sourceId === "1" &&
        effect.targetId === "1" &&
        effect.active,
    ),
    "the Philosopher is drunk",
  );
});

test("the Philosopher's drunk moves to a character that enters play later", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  assert.ok(roleId);
  const philosopher = stepFor(state, "philosopher");

  const chosen = runStep(state, "philosopher-absent", { key: philosopher.key, roleId });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  assert.equal(
    state.effects.some((effect) => effect.philosopher === true),
    false,
    "no drunk while the character is absent",
  );

  const pithag = stepFor(state, "pithag");
  const created = runStep(state, "pithag-entry", { key: pithag.key, targetIds: ["3"], roleId });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  assert.ok(
    state.effects.some(
      (effect) => effect.philosopher === true && effect.targetId === "3" && effect.active,
    ),
    "the character's new owner is drunk",
  );
});

test("a replacement clears the borrowed ability and the drunk", () => {
  const state = make({ 1: "philosopher", 2: "dreamer", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const philosopher = stepFor(state, "philosopher");
  const chosen = runStep(state, "philosopher-dreamer", {
    key: philosopher.key,
    roleId: "dreamer",
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  assert.equal(state.players["1"].used.philosopherAbility, "dreamer");
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const pithag = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  const replaced = runStep(state, "pithag-ex-philosopher", {
    key: pithag.key,
    targetIds: ["1"],
    roleId,
  });
  assert.equal(replaced.status, "allowed", JSON.stringify(replaced));
  assert.equal(state.players["1"].roleId, roleId);
  assert.equal(state.players["1"].used.philosopherAbility, undefined);
  assert.equal(
    state.effects.some((effect) => effect.philosopher === true && effect.active !== false),
    false,
    "the drunk is withdrawn",
  );
  assert.equal(
    state.night.queue.some(
      (candidate) =>
        candidate.actorId === "1" &&
        candidate.roleId === "dreamer" &&
        !candidate.done &&
        !candidate.skipped,
    ),
    false,
    "the borrowed step is removed before the wake",
  );
});

test("a borrowed death-triggered ability wakes after the Philosopher dies", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const philosopher = stepFor(state, "philosopher");
  const chosen = runStep(state, "philosopher-sage", { key: philosopher.key, roleId: "sage" });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));

  const demon = stepFor(state, "fanggu");
  const killed = runStep(state, "fanggu-kills-philosopher", {
    key: demon.key,
    targetIds: ["1"],
    deathIds: ["1"],
  });
  assert.equal(killed.status, "allowed", JSON.stringify(killed));
  assert.equal(state.players["1"].alive, false);
  assert.ok(
    state.night.queue.some(
      (candidate) =>
        candidate.actorId === "1" &&
        candidate.roleId === "sage" &&
        !candidate.done &&
        !candidate.skipped,
    ),
    "the borrowed Sage wakes after the death",
  );
});

test("a player who regains the Philosopher has a fresh once-per-game ability", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const philosopher = stepFor(state, "philosopher");
  const first = runStep(state, "philosopher-first", {
    key: philosopher.key,
    roleId: "clockmaker",
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.players["1"].used.philosopher, true);

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const away = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  const changed = runStep(state, "pithag-away", {
    key: away.key,
    targetIds: ["1"],
    roleId,
  });
  assert.equal(changed.status, "allowed", JSON.stringify(changed));

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const back = stepFor(state, "pithag");
  const regained = runStep(state, "pithag-back", {
    key: back.key,
    targetIds: ["1"],
    roleId: "philosopher",
  });
  assert.equal(regained.status, "allowed", JSON.stringify(regained));
  assert.equal(state.players["1"].roleId, "philosopher");
  assert.equal(state.players["1"].used.philosopher, undefined, "a fresh once-per-game ability");
});

test("a replacement survives an export and import", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const target = "3";
  const previous = state.players[target].roleId;
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  const result = runStep(state, "pithag-export", { key: step.key, targetIds: [target], roleId });
  assert.equal(result.status, "allowed", JSON.stringify(result));

  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, restored.error);
  assert.equal(restored.state.players[target].roleId, roleId);
  assert.equal(restored.state.players[target].changedFrom, previous);
  assert.equal(restored.state.players[target].team, "good");
  assertNoDuplicateCharacters(restored.state);
  assert.deepEqual(validateState(restored.state), []);
});
