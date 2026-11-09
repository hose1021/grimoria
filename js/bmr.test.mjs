import test from "node:test";
import assert from "node:assert/strict";
import {
  BMR, BMR_ALL, BMR_NIGHT_FIRST, BMR_NIGHT_OTHER, COMPOSITION, bagErrors,
  compositionFor, isBmrRole, isSupportedRole, randomBag, roleTeam
} from "./rules.js";
import { createGame, exportGame, importGame, validateState } from "./model.js";
import {
  completeStep, dealGame, endDay, endNight, executeByDecision, gossipStatement,
  moonchildChoice, recordBmrOutcome, setupErrors, skipStep, startNight
} from "./engine.js";
import { badMoonRisingScript } from "./scripts.js";

const FILL = {
  5: [3, 0, 1, 1], 6: [3, 1, 1, 1], 7: [5, 0, 1, 1], 8: [5, 1, 1, 1],
  9: [5, 2, 1, 1], 10: [7, 0, 2, 1]
};

// Builds a legal bag that contains every requested role and fills the rest
// from the same teams, then deals the requested roles to the named seats.
function make(assignment, options = {}) {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  state.script = badMoonRisingScript();
  state.scriptId = "bmr";
  state.setup.count = count;
  const required = [...new Set(Object.values(assignment))];
  const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of required) counts[roleTeam(id)] += 1;
  const target = compositionFor(count, required);
  const roles = [...required];
  for (const team of ["outsider", "townsfolk", "minion", "demon"]) {
    const need = target[team] - counts[team];
    assert.ok(need >= 0, "too many " + team + " in fixture");
    const pool = BMR[team].filter((id) => !roles.includes(id));
    assert.ok(pool.length >= need, "not enough " + team + " roles for fixture");
    roles.push(...pool.slice(0, need));
  }
  assert.equal(roles.length, count, "fixture bag size");
  state.setup.roles = roles;
  state.setup.bluffs = BMR_ALL.filter((id) => !roles.includes(id)).slice(0, count >= 7 ? 3 : 0);
  const full = { ...assignment };
  let spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) {
    if (full[id]) continue;
    full[id] = spare.shift();
  }
  const result = dealGame(state, { assignment: full });
  assert.equal(result.ok, true, JSON.stringify(result));
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

function aliveExcept(state, excluded = []) {
  return state.order.filter((id) => state.players[id].alive && !excluded.includes(id));
}

function finishNight(state) {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped);
    if (!step) return;
    const pool = aliveExcept(state, [step.actorId]);
    const ids = pool.slice(0, step.minTargets || 0);
    const result = completeStep(state, step.key, {
      targetIds: ids,
      given: { kind: "note", text: "fixture" }
    });
    if (!result.ok) {
      assert.equal(result.needsChoice, true, JSON.stringify(result));
      completeStep(state, step.key, { targetIds: ids, given: { kind: "note", text: "fixture" } });
    }
  }
  throw new Error("night did not finish");
}

function nextNight(state) {
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
}

test("Bad Moon Rising rosters, composition and night order follow the official data", () => {
  assert.equal(BMR_ALL.length, 25);
  assert.deepEqual(
    [BMR.townsfolk.length, BMR.outsider.length, BMR.minion.length, BMR.demon.length],
    [13, 4, 4, 4]
  );
  for (const id of BMR_ALL) assert.equal(isBmrRole(id), true);
  assert.equal(isSupportedRole("po"), true);
  assert.equal(isBmrRole("chef"), false);
  assert.deepEqual(compositionFor(8, ["godfather"]), { townsfolk: 4, outsider: 2, minion: 1, demon: 1 });
  assert.deepEqual(compositionFor(8, ["godfather"], -1), { townsfolk: 6, outsider: 0, minion: 1, demon: 1 });
  assert.deepEqual(compositionFor(7, ["baron"]), { townsfolk: 3, outsider: 2, minion: 1, demon: 1 });
  assert.deepEqual(BMR_NIGHT_FIRST, [
    "info", "lunatic", "sailor", "courtier", "godfather",
    "devilsadvocate", "pukka", "grandmother", "chambermaid"
  ]);
  assert.equal(BMR_NIGHT_OTHER.length, 19);
  assert.equal(BMR_NIGHT_OTHER[0], "sailor");
  assert.equal(BMR_NIGHT_OTHER.at(-1), "chambermaid");
});

test("random Bad Moon Rising bags are legal at every player count", () => {
  for (const count of Object.keys(COMPOSITION).map(Number)) {
    const bag = randomBag(count, Math.random, BMR_ALL);
    const errors = bagErrors({
      count, roles: bag.roles, bluffs: bag.bluffs, pool: BMR_ALL
    });
    assert.deepEqual(errors, [], count + ": " + JSON.stringify(errors));
    assert.equal(bag.bluffs.length, count >= 7 ? 3 : 0);
  }
});

test("the Godfather +/-1 Outsider setting is applied and impossible choices are reported", () => {
  const bag = randomBag(8, () => 0.9, BMR_ALL, { godfatherOutsider: -1 });
  assert.equal(bagErrors({
    count: 8, roles: bag.roles, bluffs: bag.bluffs, pool: BMR_ALL, godfatherOutsider: -1
  }).length, 0);
  const invalid = bagErrors({
    count: 7,
    roles: ["godfather", "chambermaid", "chef", "empath", "fortuneteller", "undertaker", "imp"],
    bluffs: ["soldier", "mayor", "virgin"],
    pool: BMR_ALL, godfatherOutsider: -1
  });
  assert.ok(invalid.some((error) => error.code === "godfather-minus"));
});

test("a Bad Moon Rising game deals, validates and starts a night", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "gossip",
    5: "devilsadvocate", 6: "po", 7: "fool"
  }, { count: 8 });
  assert.deepEqual(setupErrors(state), []);
  assert.deepEqual(validateState(state), []);
  const started = startNight(state);
  assert.equal(started.ok, true, JSON.stringify(started));
  assert.ok(state.night.queue.some((step) => step.roleId === "chambermaid"));
  assert.ok(state.night.queue.some((step) => step.roleId === "sailor"));
  assert.equal(importGame(exportGame(state)).ok, true);
});

test("Bad Moon Rising night targets are validated against the step range", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "gossip",
    5: "devilsadvocate", 6: "po", 7: "fool"
  }, { count: 8 });
  startNight(state);
  const sailor = state.night.queue.find((step) => step.roleId === "sailor");
  assert.equal(completeStep(state, sailor.key, { targetIds: [] }).ok, false);
  assert.equal(completeStep(state, sailor.key, { targetIds: ["1", "2"] }).ok, false);
  assert.equal(completeStep(state, sailor.key, { targetIds: ["1"] }).ok, true);
  assert.equal(completeStep(state, sailor.key, { targetIds: ["1"] }).ok, false);
});

test("the Po may hit three players only after a night with no choice", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "gossip",
    5: "devilsadvocate", 6: "po", 7: "fool"
  }, { count: 8 });
  assert.equal(startNight(state).ok, true);
  nextNight(state); // Po does not wake on night one.
  const first = state.night.queue.find((step) => step.roleId === "po");
  assert.ok(first);
  assert.equal(first.minTargets, 0);
  assert.equal(first.maxTargets, 1);
  completeStep(state, first.key, { targetIds: [] });
  assert.equal(state.players["6"].used.poNoOne, true);
  nextNight(state);
  const second = state.night.queue.find((step) => step.roleId === "po");
  assert.ok(second);
  assert.equal(second.minTargets, 3);
  assert.equal(second.maxTargets, 3);
});

test("the Assassin kills through the Fool's protection", () => {
  const state = make({
    1: "fool", 2: "chambermaid", 3: "sailor", 4: "courtier",
    5: "po", 6: "assassin", 7: "exorcist"
  }, { count: 8 });
  startNight(state);
  nextNight(state);
  const assassin = state.night.queue.find((step) => step.roleId === "assassin");
  assert.ok(assassin);
  completeStep(state, assassin.key, { targetIds: ["1"] });
  recordBmrOutcome(state, assassin.key, { deathIds: ["1"] });
  assert.equal(state.players["1"].alive, false);
  assert.equal(state.players["1"].used.fool, undefined, "the Assassin ignored the Fool's ability");
});

test("the Zombuul survives its first death but registers as dead", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "gossip",
    5: "devilsadvocate", 6: "zombuul", 7: "fool"
  }, { count: 8 });
  state.phase = "day";
  state.day = { number: 1, morning: [], nominations: [], activeNominationId: null, execution: null, ended: false, open: true };
  const result = executeByDecision(state, "6");
  assert.equal(result.ok, true);
  assert.equal(state.players["6"].alive, true);
  assert.equal(state.players["6"].registeredDead, true);
  assert.equal(state.winner, null);
  assert.equal(state.players["6"].used.zombuul, true);
});

test("the Mastermind extends the game by one day after a Demon execution", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "mastermind", 4: "sailor",
    5: "gossip", 6: "po", 7: "fool"
  }, { count: 8 });
  state.phase = "day";
  state.day = { number: 1, morning: [], nominations: [], activeNominationId: null, execution: null, ended: false, open: true };
  executeByDecision(state, "6");
  assert.equal(state.winner, null);
  assert.equal(state.mastermind.active, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.phase, "day");
  assert.equal(state.day.number, 2);
  executeByDecision(state, "1");
  endDay(state);
  assert.equal(state.winner.team, "evil");
  assert.equal(state.winner.reason, "mastermind");
});

test("a Minion execution makes everyone except the Minstrel drunk", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "gossip",
    5: "devilsadvocate", 6: "po", 7: "minstrel"
  }, { count: 9 });
  state.phase = "day";
  state.day = { number: 1, morning: [], nominations: [], activeNominationId: null, execution: null, ended: false, open: true };
  executeByDecision(state, "5");
  const drunk = state.effects.filter((effect) => effect.kind === "drunk");
  assert.equal(drunk.length, 7);
  assert.ok(drunk.every((effect) => effect.targetId !== "7"));
});

test("the Professor resurrects a dead Townsfolk only", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "gossip",
    5: "professor", 6: "po", 7: "goon"
  }, { count: 8 });
  state.players["1"].alive = false;
  finishNight((startNight(state), state));
  assert.equal(endNight(state).ok, true);
  endDay(state);
  const professor = state.night.queue.find((step) => step.roleId === "professor");
  assert.ok(professor);
  completeStep(state, professor.key, { targetIds: ["1"] });
  recordBmrOutcome(state, professor.key, { resurrectId: "1" });
  assert.equal(state.players["1"].alive, true);
});

test("the Devil's Advocate prevents tomorrow's execution death", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "gossip",
    5: "devilsadvocate", 6: "po", 7: "fool"
  }, { count: 8 });
  startNight(state);
  const advocate = state.night.queue.find((step) => step.roleId === "devilsadvocate");
  completeStep(state, advocate.key, { targetIds: ["2"] });
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  const result = executeByDecision(state, "2");
  assert.equal(result.ok, true);
  assert.equal(state.players["2"].alive, true);
});

test("the Gossip statement schedules a night death only when it was true", () => {
  for (const truth of [false, true]) {
    const state = make({
      1: "chambermaid", 2: "courtier", 3: "sailor", 4: "gossip",
      5: "devilsadvocate", 6: "po", 7: "fool"
    }, { count: 8 });
    startNight(state);
    finishNight(state);
    assert.equal(endNight(state).ok, true);
    state.phase = "day";
    state.day = { number: 1, morning: [], nominations: [], activeNominationId: null, execution: null, ended: false, open: true };
    assert.equal(gossipStatement(state, truth).ok, true);
    assert.equal(endDay(state).ok, true);
    assert.equal(state.night.queue.some((step) => step.roleId === "gossip"), truth);
  }
});

test("the Moonchild picks a living player after dying", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "moonchild",
    5: "devilsadvocate", 6: "po", 7: "fool"
  }, { count: 9 });
  state.players["4"].alive = false;
  state.phase = "day";
  state.day = { number: 1, morning: [], nominations: [], activeNominationId: null, execution: null, ended: false, open: true };
  assert.equal(moonchildChoice(state, "99").ok, false);
  assert.equal(moonchildChoice(state, "1").ok, true);
  assert.equal(state.players["4"].used.moonchildTarget, "1");
});

test("the Exorcist stops the chosen Demon's wake", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "exorcist",
    5: "devilsadvocate", 6: "po", 7: "grandmother"
  }, { count: 9 });
  nextNight(state);
  const exorcist = state.night.queue.find((step) => step.roleId === "exorcist");
  assert.ok(exorcist);
  completeStep(state, exorcist.key, { targetIds: ["6"] });
  const demon = state.night.queue.find((step) => step.roleId === "po");
  assert.equal(demon.done || demon.skipped, true);
  assert.match(demon.note || "", /Экзорцист|Экзорциста/);
});

test("the Grandmother stores the grandchild and dies when the Demon kills them", () => {
  const state = make({
    1: "chambermaid", 2: "courtier", 3: "sailor", 4: "grandmother",
    5: "devilsadvocate", 6: "po", 7: "fool"
  }, { count: 9 });
  startNight(state);
  const grandmother = state.night.queue.find((step) => step.roleId === "grandmother");
  completeStep(state, grandmother.key, { targetIds: ["1"] });
  assert.equal(state.setup.grandmotherId, "1");
  nextNight(state);
  const po = state.night.queue.find((step) => step.roleId === "po");
  completeStep(state, po.key, { targetIds: ["1"] });
  recordBmrOutcome(state, po.key, { deathIds: ["1"] });
  const extra = state.night.queue.find((step) => step.roleId === "grandmother");
  assert.ok(extra, "the Grandmother's death step is inserted");
});
