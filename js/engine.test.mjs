import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_ROLES, COMPOSITION, compositionFor, isGoodRole, bagErrors, randomBag,
  requiredBluffs
} from "./rules.js";
import {
  createGame, importGame, exportGame, migrateV2, publicGameView, publicRoleView,
  orderedPlayers
} from "./model.js";
import {
  autoSecrets, cancelNomination, checkWin, completeStep, currentStep, dayAt,
  dealGame, endDay, endNight, execute, infoForStep, isImpaired, kill, leader,
  chefCount, chooseDemonHeir, executeByDecision, executionThreshold, fortuneTellerYes,
  nominate, openNominations, recordVotes, resetVotes, secretsErrors, skipStep,
  startNight, useSlayer, recordVirginNomination, recoverClaim, attackNeedsRedirect
} from "./engine.js";

function make(assignment, options = {}) {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  Object.entries(assignment).forEach(([id]) => {
    state.players[id].name = "P" + id;
  });
  const roles = [...new Set(Object.values(assignment))];
  state.setup.count = count;
  state.setup.roles = roles;
  const bluffPool = ALL_ROLES.filter((id) => (
    isGoodRole(id) && !roles.includes(id) && id !== options.drunkShownId
  ));
  state.setup.bluffs = count >= 7 ? bluffPool.slice(0, 3) : [];
  state.setup.drunkShownId = options.drunkShownId || null;
  const result = dealGame(state, { assignment });
  assert.equal(result.ok, true, JSON.stringify(result));
  autoSecrets(state);
  const drunk = orderedPlayers(state).find((player) => player.roleId === "drunk");
  const mask = drunk && drunk.shownRoleId;
  if (mask && ["washerwoman", "librarian", "investigator"].includes(mask)) {
    const team = mask === "washerwoman" ? "townsfolk" : mask === "librarian" ? "outsider" : "minion";
    const pool = orderedPlayers(state).filter((player) => player.id !== drunk.id);
    state.setup.info[mask] = {
      forDrunk: true,
      roleId: team === "townsfolk" ? "chef" : team === "outsider" ? "saint" : "spy",
      pair: [pool[0].id, pool[1].id]
    };
  }
  return state;
}

function roleStep(state, roleId) {
  return state.night.queue.find((step) => step.roleId === roleId && !step.done);
}

function systemStep(state, system) {
  return state.night.queue.find((step) => step.system === system && !step.done);
}

function completeSystem(state, system) {
  const step = systemStep(state, system);
  assert.ok(step, "no system step " + system);
  const result = completeStep(state, step.key, {});
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}

function completeRole(state, roleId, options = {}) {
  const step = roleStep(state, roleId);
  assert.ok(step, "no step for " + roleId);
  const result = completeStep(state, step.key, options);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}

function skipNight(state) {
  while (currentStep(state)) {
    skipStep(state, currentStep(state).key, "test");
  }
  const result = endNight(state);
  assert.equal(result.ok, true, JSON.stringify(result));
}

function toDay(state) {
  const result = startNight(state);
  assert.equal(result.ok, true, JSON.stringify(result));
  skipNight(state);
  return state;
}

function appoint(state, nominatorId, nomineeId, voters) {
  const result = nominate(state, nominatorId, nomineeId);
  assert.equal(result.ok, true, JSON.stringify(result));
  const nomination = state.day.nominations[state.day.nominations.length - 1];
  const votes = recordVotes(state, nomination.id, voters);
  assert.equal(votes.ok, true, JSON.stringify(votes));
  return nomination;
}

test("composition table is exact and Baron shifts two Townsfolk to Outsiders", () => {
  const expected = {
    5: [3, 0, 1, 1], 6: [3, 1, 1, 1], 7: [5, 0, 1, 1], 8: [5, 1, 1, 1],
    9: [5, 2, 1, 1], 10: [7, 0, 2, 1], 11: [7, 1, 2, 1], 12: [7, 2, 2, 1],
    13: [9, 0, 3, 1], 14: [9, 1, 3, 1], 15: [9, 2, 3, 1]
  };
  for (const [count, rows] of Object.entries(expected)) {
    const got = COMPOSITION[count];
    assert.deepEqual(got, rows, "table " + count);
    const sum = got.reduce((a, b) => a + b, 0);
    assert.equal(sum, Number(count));
    assert.equal(got[3], 1);
  }
  assert.deepEqual(compositionFor(5), { townsfolk: 3, outsider: 0, minion: 1, demon: 1 });
  assert.deepEqual(compositionFor(5, ["baron"]), { townsfolk: 1, outsider: 2, minion: 1, demon: 1 });
  assert.deepEqual(compositionFor(12, ["baron"]), { townsfolk: 5, outsider: 4, minion: 2, demon: 1 });
});

test("bag validation rejects duplicates, wrong counts, and Drunk mask leaks", () => {
  assert.ok(bagErrors({ count: 5, roles: ["chef", "chef", "empath", "poisoner", "imp"] }).length);
  assert.ok(bagErrors({ count: 5, roles: ["chef", "empath", "monk", "poisoner", "imp"], bluffs: ["mayor"] }).length);
  assert.equal(bagErrors({
    count: 5,
    roles: ["chef", "empath", "monk", "poisoner", "imp"],
    bluffs: []
  }).length, 0);
  const drunkErrors = bagErrors({
    count: 6,
    roles: ["drunk", "chef", "empath", "monk", "poisoner", "imp"],
    bluffs: [],
    drunkShownId: "empath"
  });
  assert.ok(drunkErrors.some((error) => error.code === "drunk-inplay"));
  const bluffErrors = bagErrors({
    count: 7,
    roles: ["drunk", "chef", "empath", "monk", "undertaker", "poisoner", "imp"],
    bluffs: ["washerwoman", "librarian", "mayor"],
    drunkShownId: "washerwoman"
  });
  assert.ok(bluffErrors.some((error) => error.code === "bluffs-drunk"));
});

test("random bags are legal for every supported size", () => {
  for (let count = 5; count <= 15; count += 1) {
    const bag = randomBag(count);
    const errors = bagErrors({ count, ...bag });
    assert.equal(errors.length, 0, count + ": " + errors.map((e) => e.message).join(", "));
    assert.equal(bag.bluffs.length, requiredBluffs(count));
  }
});

test("Drunk keeps the real role and the shown role apart", () => {
  const state = make({
    "1": "drunk", "2": "empath", "3": "chef", "4": "monk", "5": "poisoner", "6": "imp"
  }, { drunkShownId: "washerwoman" });
  assert.equal(state.players["1"].roleId, "drunk");
  assert.equal(state.players["1"].shownRoleId, "washerwoman");
  assert.equal(state.players["2"].roleId, "empath");
  const view = publicRoleView(state.players["1"], {
    name: "Washerwoman", team: "townsfolk", ability: "One of two."
  });
  assert.equal(view.role, "Washerwoman");
  assert.equal(Object.hasOwn(view, "roleId"), false);
  const result = startNight(state);
  assert.equal(result.ok, true);
  assert.ok(state.night.queue.some((step) => step.roleId === "washerwoman" && step.actorId === "1"));
  assert.equal(state.night.queue.some((step) => step.roleId === "imp"), false);
  const step = roleStep(state, "washerwoman");
  const info = infoForStep(state, step, {});
  assert.equal(info.needsChoice, true);
  assert.equal(Boolean(info.missing), false);
});

test("5–6 player first night has no evil introduction and no bluffs", () => {
  const five = make({
    "1": "chef", "2": "empath", "3": "monk", "4": "poisoner", "5": "imp"
  });
  assert.equal(five.bluffs.length, 0);
  startNight(five);
  assert.equal(five.night.queue.some((step) => step.system === "minioninfo"), false);
  assert.equal(five.night.queue.some((step) => step.system === "demoninfo"), false);

  const seven = make({
    "1": "washerwoman", "2": "chef", "3": "empath", "4": "monk",
    "5": "undertaker", "6": "poisoner", "7": "imp"
  });
  assert.equal(seven.bluffs.length, 3);
  startNight(seven);
  assert.ok(systemStep(seven, "minioninfo"));
  assert.ok(systemStep(seven, "demoninfo"));
  assert.deepEqual(
    seven.night.queue.map((step) => step.system || step.roleId).filter(Boolean).slice(0, 4),
    ["minioninfo", "demoninfo", "poisoner", "washerwoman"]
  );
});

test("first-night information is computed from real players and seats", () => {
  const state = make({
    "1": "washerwoman", "2": "chef", "3": "empath", "4": "fortuneteller",
    "5": "undertaker", "6": "poisoner", "7": "imp"
  });
  startNight(state);
  completeSystem(state, "minioninfo");
  completeSystem(state, "demoninfo");
  completeRole(state, "poisoner", { targetIds: ["3"] });
  const washer = roleStep(state, "washerwoman");
  const washerInfo = infoForStep(state, washer, {});
  assert.equal(washerInfo.kind, "one-of-two");
  assert.equal(washerInfo.roleId, "chef");
  assert.equal(washerInfo.pair.length, 2);
  completeRole(state, "washerwoman");
  const chefInfo = infoForStep(state, roleStep(state, "chef"), {});
  assert.equal(chefInfo.kind, "number");
  assert.equal(typeof chefInfo.value, "number");
  const empath = roleStep(state, "empath");
  assert.equal(isImpaired(state, "3", { phase: "night", number: 1 }), true);
  const empathInfo = infoForStep(state, empath, {});
  assert.equal(empathInfo.needsChoice, true);
  completeRole(state, "empath", { given: { kind: "number", value: 1 } });
  assert.equal(state.night.queue.find((step) => step.roleId === "empath").given.value, 1);
});

test("poison lasts the night and the next day, then expires", () => {
  const state = make({
    "1": "empath", "2": "chef", "3": "monk", "4": "undertaker",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  startNight(state);
  completeSystem(state, "minioninfo");
  completeSystem(state, "demoninfo");
  completeRole(state, "poisoner", { targetIds: ["1"] });
  assert.equal(isImpaired(state, "1", { phase: "night", number: 1 }), true);
  assert.equal(isImpaired(state, "1", { phase: "day", number: 1 }), true);
  assert.equal(isImpaired(state, "1", { phase: "night", number: 2 }), false);
  // Killing the source ends the persistent effect immediately.
  kill(state, "6", "test", { phase: "night", number: 1 });
  assert.equal(isImpaired(state, "1", { phase: "night", number: 1 }), false);
});

test("Monk protection and Soldier safety stop the Imp", () => {
  const state = make({
    "1": "monk", "2": "soldier", "3": "empath", "4": "chef",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.phase, "night");
  assert.equal(state.night.number, 2);
  completeRole(state, "poisoner", { targetIds: ["3"] });
  completeRole(state, "monk", { targetIds: ["4"] });
  completeRole(state, "imp", { targetIds: ["4"] });
  assert.equal(state.players["4"].alive, true);

  const soldier = make({
    "1": "monk", "2": "soldier", "3": "empath", "4": "chef",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  toDay(soldier);
  assert.equal(endDay(soldier).ok, true);
  completeRole(soldier, "poisoner", { targetIds: ["3"] });
  completeRole(soldier, "monk", { targetIds: ["4"] });
  completeRole(soldier, "imp", { targetIds: ["2"] });
  assert.equal(soldier.players["2"].alive, true);
});

test("poisoned protection fails and the target dies", () => {
  const state = make({
    "1": "monk", "2": "soldier", "3": "empath", "4": "chef",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["1"] });
  completeRole(state, "monk", { targetIds: ["4"] });
  completeRole(state, "imp", { targetIds: ["4"] });
  assert.equal(state.players["4"].alive, false);
});

test("Ravenkeeper wakes after a night death and learns a character", () => {
  const state = make({
    "1": "ravenkeeper", "2": "chef", "3": "empath", "4": "monk",
    "5": "undertaker", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["2"] });
  completeRole(state, "imp", { targetIds: ["1"] });
  const rk = roleStep(state, "ravenkeeper");
  assert.ok(rk, "ravenkeeper step inserted");
  assert.equal(rk.actorId, "1");
  assert.equal(rk.actorAlive, false);
  completeRole(state, "ravenkeeper", { targetIds: ["2"] });
  const step = state.night.queue.find((candidate) => candidate.roleId === "ravenkeeper");
  assert.equal(step.done, true);
  assert.ok(step.given);
});

test("Undertaker learns an execution death, not a night death", () => {
  const state = make({
    "1": "undertaker", "2": "chef", "3": "empath", "4": "monk",
    "5": "soldier", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  openNominations(state);
  appoint(state, "1", "2", ["1", "2", "3", "4", "5"]);
  const execution = execute(state, state.day.nominations[0].id);
  assert.equal(execution.ok, true);
  endDay(state);
  startNight(state);
  const step = roleStep(state, "undertaker");
  assert.ok(step, "undertaker step on the next night");
  completeRole(state, "undertaker");
  const done = state.night.queue.find((candidate) => candidate.roleId === "undertaker");
  assert.equal(done.given.roleId, "chef");
});

test("Scarlet Woman inherits only with five living before the Demon dies", () => {
  const five = make({
    "1": "chef", "2": "monk", "3": "mayor", "4": "scarletwoman", "5": "imp"
  });
  five.phase = "day";
  five.day = {
    number: 1, morning: [], nominations: [], activeNominationId: null,
    execution: null, ended: false, open: true
  };
  appoint(five, "2", "5", ["2", "3", "4"]);
  const result = execute(five, five.day.nominations[0].id);
  assert.equal(result.ok, true);
  assert.equal(five.players["5"].alive, false);
  assert.equal(five.players["4"].roleId, "imp");
  assert.equal(five.winner, null, "the new Demon keeps the game alive");
});

test("Scarlet Woman does not inherit below the threshold", () => {
  const state = make({
    "1": "chef", "2": "monk", "3": "mayor", "4": "scarletwoman", "5": "imp"
  });
  kill(state, "1", "test", dayAt(state));
  state.phase = "day";
  state.day = {
    number: 1, morning: [], nominations: [], activeNominationId: null,
    execution: null, ended: false, open: true
  };
  const result = execute(state, (() => {
    appoint(state, "2", "5", ["2", "3", "4"]);
    return state.day.nominations[0].id;
  })());
  assert.equal(result.ok, true);
  assert.equal(state.players["4"].roleId, "scarletwoman");
  assert.equal(state.winner && state.winner.team, "good");
});

test("Imp self-kill passes the role and the new Demon does not act again", () => {
  const state = make({
    "1": "chef", "2": "monk", "3": "mayor", "4": "soldier",
    "5": "empath", "6": "scarletwoman", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "monk", { targetIds: ["3"] });
  completeRole(state, "imp", { targetIds: ["7"] });
  assert.equal(state.players["7"].alive, false);
  assert.equal(state.players["6"].roleId, "imp");
  assert.equal(
    state.night.queue.filter((step) => step.roleId === "imp" && !step.done).length,
    0
  );
});

test("Virgin executes only the first eligible Townsfolk nominator", () => {
  const state = make({
    "1": "virgin", "2": "chef", "3": "empath", "4": "monk",
    "5": "soldier", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  openNominations(state);
  const result = nominate(state, "2", "1");
  assert.equal(result.ok, true);
  assert.equal(result.virgin, true);
  assert.equal(state.players["2"].alive, false);
  assert.equal(state.players["1"].alive, true);
  assert.equal(state.day.nominations.length, 0);
  assert.equal(state.day.execution.cause, "virgin");
});

test("Drunk nominator does not trigger the Virgin", () => {
  const state = make({
    "1": "virgin", "2": "drunk", "3": "chef", "4": "empath",
    "5": "monk", "6": "poisoner", "7": "imp", "8": "soldier"
  }, { drunkShownId: "washerwoman" });
  toDay(state);
  openNominations(state);
  const result = nominate(state, "2", "1");
  assert.equal(result.ok, true);
  assert.equal(Boolean(result.virgin), false);
  assert.equal(state.day.nominations.length, 1);
  assert.equal(state.players["2"].alive, true);
});

test("a poisoned Slayer spends the ability without killing", () => {
  const state = make({
    "1": "slayer", "2": "chef", "3": "empath", "4": "monk",
    "5": "soldier", "6": "poisoner", "7": "imp"
  });
  startNight(state);
  completeSystem(state, "minioninfo");
  completeSystem(state, "demoninfo");
  completeRole(state, "poisoner", { targetIds: ["1"] });
  skipNight(state);
  const result = useSlayer(state, "1", "7");
  assert.equal(result.ok, true);
  assert.equal(result.hit, false);
  assert.equal(state.players["7"].alive, true);
  assert.equal(state.players["1"].used.slayer, true);
});

test("a healthy Slayer kills the Demon and good wins", () => {
  const state = make({
    "1": "slayer", "2": "chef", "3": "empath", "4": "monk",
    "5": "soldier", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  const result = useSlayer(state, "1", "7");
  assert.equal(result.ok, true);
  assert.equal(result.hit, true);
  assert.equal(state.players["7"].alive, false);
  assert.equal(state.winner && state.winner.team, "good");
});

test("dead votes count once, are spent on a failed nomination, and cannot repeat", () => {
  const state = make({
    "1": "chef", "2": "empath", "3": "monk", "4": "soldier",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  openNominations(state);
  appoint(state, "1", "2", ["1", "2", "3", "4", "5"]);
  execute(state, state.day.nominations[0].id);
  endDay(state);
  skipNight(state);
  openNominations(state);
  const nomination = appoint(state, "3", "4", ["2"]);
  assert.equal(nomination.count, 1);
  assert.equal(state.players["2"].voteToken, false);
  assert.equal(nomination.result, "failed");
  const second = nominate(state, "5", "1");
  assert.equal(second.ok, true);
  const votes = recordVotes(state, second.nomination.id, ["2"]);
  assert.equal(votes.ok, true);
  assert.equal(votes.nomination.count, 0);
  assert.ok(votes.nomination.butlerWarning.length >= 0);
});

test("ties on the maximum block execution, and a lower tie does not dethrone the leader", () => {
  const state = make({
    "1": "chef", "2": "empath", "3": "monk", "4": "soldier",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  openNominations(state);
  appoint(state, "1", "2", ["1", "2", "3", "4"]);
  appoint(state, "2", "3", ["1", "2", "3", "4"]);
  let result = leader(state);
  assert.equal(result.tie, true);
  const third = appoint(state, "3", "4", ["1", "2", "3", "4", "5"]);
  result = leader(state);
  assert.equal(result.nomination.id, third.id);
  assert.equal(result.count, 5);
  appoint(state, "4", "5", ["1", "2"]);
  result = leader(state);
  assert.equal(result.nomination.id, third.id);
});

test("execution is an execution event, not automatically a death", () => {
  const state = make({
    "1": "chef", "2": "empath", "3": "monk", "4": "soldier",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  kill(state, "4", "test", dayAt(state));
  openNominations(state);
  const beforeDeaths = state.deaths.length;
  appoint(state, "1", "4", ["1", "2", "3", "5"]);
  const result = execute(state, state.day.nominations[0].id);
  assert.equal(result.ok, true);
  assert.equal(state.deaths.length, beforeDeaths);
  assert.equal(state.executions.length, 1);
  assert.equal(state.day.execution.playerId, "4");
});

test("Saint loses on execution and Mayor wins at three alive without execution", () => {
  const saint = make({
    "1": "saint", "2": "chef", "3": "empath", "4": "monk",
    "5": "soldier", "6": "virgin", "7": "poisoner", "8": "imp"
  });
  toDay(saint);
  openNominations(saint);
  appoint(saint, "1", "1", ["1", "2", "3", "4", "5"]);
  execute(saint, saint.day.nominations[0].id);
  assert.equal(saint.winner && saint.winner.team, "evil");
  assert.equal(saint.winner.reason, "saint");

  const mayor = make({
    "1": "mayor", "2": "chef", "3": "monk", "4": "poisoner", "5": "imp"
  });
  toDay(mayor);
  kill(mayor, "2", "test", dayAt(mayor));
  kill(mayor, "3", "test", dayAt(mayor));
  const result = endDay(mayor);
  assert.equal(result.ok, true);
  assert.equal(mayor.winner && mayor.winner.team, "good");
  assert.equal(mayor.winner.reason, "mayor");
});

test("Mayor does not win when an execution happened but nobody died", () => {
  const state = make({
    "1": "mayor", "2": "chef", "3": "monk", "4": "poisoner", "5": "imp"
  });
  toDay(state);
  kill(state, "2", "test", dayAt(state));
  kill(state, "3", "test", dayAt(state));
  openNominations(state);
  appoint(state, "1", "2", ["1", "4"]);
  execute(state, state.day.nominations[0].id);
  endDay(state);
  assert.equal(state.winner, null);
});

test("win priorities: no living Demon is checked before the two-alive evil win", () => {
  const state = make({
    "1": "chef", "2": "monk", "3": "mayor", "4": "scarletwoman", "5": "imp"
  });
  kill(state, "4", "test", dayAt(state));
  kill(state, "1", "test", dayAt(state));
  kill(state, "5", "test", dayAt(state));
  const winner = checkWin(state);
  assert.equal(winner && winner.team, "good");
  assert.equal(winner.reason, "demon-dead");
});

test("execution requires at least half the living players", () => {
  assert.equal(executionThreshold(5), 3);
  assert.equal(executionThreshold(6), 3);
  assert.equal(executionThreshold(7), 4);
  assert.equal(executionThreshold(8), 4);
  const state = make({
    "1": "chef", "2": "empath", "3": "monk",
    "4": "saint", "5": "poisoner", "6": "imp"
  });
  toDay(state);
  openNominations(state);
  const nomination = nominate(state, "1", "2").nomination;
  const three = recordVotes(state, nomination.id, ["1", "3", "4"]);
  assert.equal(three.ok, true);
  assert.equal(three.nomination.threshold, 3);
  assert.equal(three.nomination.result, "qualified");
  const reset = resetVotes(state, nomination.id, "test");
  assert.equal(reset.ok, true);
  const four = recordVotes(state, nomination.id, ["1", "3", "4", "5"]);
  assert.equal(four.ok, true);
  assert.equal(four.nomination.result, "qualified");
});

test("completed night steps and recorded votes cannot be applied twice", () => {
  const state = make({
    "1": "chef", "2": "empath", "3": "monk", "4": "soldier",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  startNight(state);
  completeSystem(state, "minioninfo");
  completeSystem(state, "demoninfo");
  completeRole(state, "poisoner", { targetIds: ["1"] });
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner");
  const again = completeStep(state, step.key, { targetIds: ["2"] });
  assert.equal(again.ok, false);
  skipNight(state);
  openNominations(state);
  const nomination = appoint(state, "1", "2", ["1", "2"]);
  const repeat = recordVotes(state, nomination.id, ["3"]);
  assert.equal(repeat.ok, false);
  const cancel = cancelNomination(state, nomination.id);
  assert.equal(cancel.ok, false);
});

test("migration, export/import and public projection keep secrets out of public data", () => {
  const legacy = {
    v: 2,
    scriptId: "tb",
    night: 1,
    order: ["1", "2", "3", "4", "5"],
    players: {
      "1": { name: "A", alive: true, claimed: true, roleId: "empath", shownRoleId: "empath", reminders: [] },
      "2": { name: "B", alive: true, claimed: true, roleId: "imp", shownRoleId: "imp", reminders: [] },
      "3": { name: "C", alive: false, claimed: true, roleId: "chef", shownRoleId: "chef", reminders: [] },
      "4": { name: "D", alive: true, claimed: true, roleId: "monk", shownRoleId: "monk", reminders: [] },
      "5": { name: "E", alive: true, claimed: true, roleId: "poisoner", shownRoleId: "poisoner", reminders: [] }
    },
    bluffs: [],
    nightOrder: [],
    log: [],
    notes: "secret"
  };
  const migrated = migrateV2(legacy);
  assert.equal(migrated.v, 4);
  assert.equal(migrated.players["3"].alive, false);
  assert.equal(migrated.deaths.length, 1);
  const exported = exportGame(migrated);
  const imported = importGame(exported);
  assert.equal(imported.ok, true);
  assert.equal(imported.state.players["1"].roleId, "empath");
  const bad = importGame({ format: "pocket-grimoire", version: 3, game: { v: 3, players: {} } });
  assert.equal(bad.ok, false);

  const role = { name: "Empath", team: "townsfolk", ability: "Learn a number." };
  const publicRole = publicRoleView(migrated.players["1"], role);
  assert.equal(JSON.stringify(publicRole).includes("roleId"), false);
  const publicGame = publicGameView(migrated);
  const text = JSON.stringify(publicGame);
  assert.equal(text.includes("empath"), false);
  assert.equal(text.includes("poisoner"), false);
  assert.equal(text.includes("secret"), false);
});

test("Imp attack on the Mayor can be redirected to another player", () => {
  const state = make({
    "1": "mayor", "2": "chef", "3": "monk", "4": "soldier",
    "5": "empath", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["5"] });
  const imp = roleStep(state, "imp");
  const first = completeStep(state, imp.key, { targetIds: ["1"] });
  assert.equal(first.ok, false);
  assert.equal(first.needsRedirect, true);
  const second = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "2" });
  assert.equal(second.ok, true);
  assert.equal(state.players["1"].alive, true);
  assert.equal(state.players["2"].alive, false);
});

test("a Mayor redirect to a dead player kills nobody and keeps the Mayor alive", () => {
  const state = make({
    "1": "mayor", "2": "chef", "3": "monk", "4": "soldier",
    "5": "empath", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["5"] });
  kill(state, "2", "test");
  const deathsBefore = state.deaths.length;
  const imp = roleStep(state, "imp");
  const prompt = completeStep(state, imp.key, { targetIds: ["1"] });
  assert.equal(prompt.ok, false);
  assert.equal(prompt.needsRedirect, true);
  assert.ok(prompt.options.some((option) => option.id === "2" && option.alive === false),
    "the Storyteller may name a dead player");
  const attack = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "2" });
  assert.equal(attack.ok, true);
  assert.equal(attack.result.noDeath, true);
  assert.equal(attack.result.deathId, undefined);
  assert.equal(state.players["1"].alive, true, "the Mayor survives");
  assert.equal(state.players["2"].alive, false);
  assert.equal(state.deaths.length, deathsBefore, "a dead replacement produces no extra death");
});

test("a Mayor redirect to a healthy Soldier kills nobody and keeps the Mayor alive", () => {
  const state = make({
    "1": "mayor", "2": "chef", "3": "monk", "4": "soldier",
    "5": "empath", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["5"] });
  const imp = roleStep(state, "imp");
  const attack = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "4" });
  assert.equal(attack.ok, true);
  assert.equal(attack.result.noDeath, true);
  assert.equal(state.players["1"].alive, true, "the Mayor survives a Soldier replacement");
  assert.equal(state.players["4"].alive, true, "the Soldier is safe from the Demon");
});

test("a Mayor redirect to a Monk-protected player kills nobody and keeps the Mayor alive", () => {
  const state = make({
    "1": "mayor", "2": "chef", "3": "monk", "4": "soldier",
    "5": "empath", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["4"] });
  completeRole(state, "monk", { targetIds: ["5"] });
  const imp = roleStep(state, "imp");
  const attack = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "5" });
  assert.equal(attack.ok, true);
  assert.equal(attack.result.noDeath, true);
  assert.equal(state.players["1"].alive, true, "the Mayor survives");
  assert.equal(state.players["5"].alive, true, "the Monk-protected replacement survives");
});

test("a poisoned Mayor dies to the Demon with no redirection and no host prompt", () => {
  const state = make({
    "1": "mayor", "2": "chef", "3": "empath", "4": "poisoner", "5": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["1"] });
  const imp = roleStep(state, "imp");
  // The Poisoner's own step must never look like a redirect decision.
  const poisonStep = state.night.queue.find((step) => step.roleId === "poisoner");
  assert.equal(attackNeedsRedirect(state, { attackerId: poisonStep.actorId, targetId: poisonStep.targetIds[0] }), false);
  assert.equal(attackNeedsRedirect(state, { attackerId: "5", targetId: "1" }), false);
  const attack = completeStep(state, imp.key, { targetIds: ["1"] });
  assert.equal(attack.ok, true);
  assert.equal(attack.needsRedirect, undefined);
  assert.equal(state.players["1"].alive, false);
  assert.equal(state.deaths.at(-1).roleId, "mayor");
  assert.equal(state.deaths.at(-1).impaired, true);
});

test("a poisoned Mayor does not win for good at three alive without execution", () => {
  const state = make({
    "1": "mayor", "2": "chef", "3": "empath", "4": "poisoner", "5": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["1"] });
  skipStep(state, roleStep(state, "imp").key, "test");
  skipNight(state);
  assert.equal(state.phase, "day");
  kill(state, "2", "test", dayAt(state));
  kill(state, "3", "test", dayAt(state));
  endDay(state);
  // Three living, no execution, but the poisoned Mayor has no ability.
  assert.equal(state.winner, null);
});

test("a Monk-protected or Soldier Mayor target never asks for a redirection", () => {
  const state = make({
    "1": "mayor", "2": "chef", "3": "monk", "4": "soldier",
    "5": "empath", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  assert.equal(attackNeedsRedirect(state, { attackerId: "7", targetId: "1" }), true);
  completeRole(state, "monk", { targetIds: ["1"] });
  assert.equal(attackNeedsRedirect(state, { attackerId: "7", targetId: "1" }), false);
  assert.equal(attackNeedsRedirect(state, { attackerId: "7", targetId: "4" }), false);
  kill(state, "5", "test", dayAt(state));
  assert.equal(attackNeedsRedirect(state, { attackerId: "7", targetId: "5" }), false);
  state.players["1"].alive = false;
  assert.equal(attackNeedsRedirect(state, { attackerId: "7", targetId: "1" }), false);
});

test("a poisoned Demon attacking a healthy Mayor asks for no redirection", () => {
  const state = make({
    "1": "mayor", "2": "chef", "3": "monk", "4": "soldier",
    "5": "empath", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["7"] });
  assert.equal(isImpaired(state, "7", { phase: "night", number: 2 }), true);
  assert.equal(attackNeedsRedirect(state, { attackerId: "7", targetId: "1" }), false);
  const attack = completeRole(state, "imp", { targetIds: ["1"] });
  assert.equal(attack.result.noDeath, true);
  assert.equal(state.players["1"].alive, true);
});

test("a poisoned Scarlet Woman cannot inherit the Demon role", () => {
  const state = make({
    "1": "chef", "2": "empath", "3": "monk", "4": "soldier",
    "5": "mayor", "6": "virgin", "7": "slayer", "8": "poisoner",
    "9": "scarletwoman", "10": "imp"
  });
  startNight(state);
  completeSystem(state, "minioninfo");
  completeSystem(state, "demoninfo");
  completeRole(state, "poisoner", { targetIds: ["9"] });
  skipNight(state);
  openNominations(state);
  appoint(state, "1", "10", ["1", "2", "3", "4", "5", "6"]);
  execute(state, state.day.nominations[0].id);
  assert.equal(state.players["9"].roleId, "scarletwoman");
  assert.equal(state.winner && state.winner.team, "good");
});

test("Spy and Recluse registrations are explicit host choices", () => {
  const state = make({
    "1": "recluse", "2": "imp", "3": "chef", "4": "empath",
    "5": "monk", "6": "soldier", "7": "mayor", "8": "poisoner"
  });
  assert.equal(chefCount(state, {}), 0);
  assert.equal(chefCount(state, { "1": "evil" }), 2);

  const fortune = make({
    "1": "recluse", "2": "imp", "3": "chef", "4": "empath",
    "5": "monk", "6": "soldier", "7": "mayor", "8": "poisoner"
  });
  fortune.setup.herringId = "3";
  assert.equal(fortuneTellerYes(fortune, ["1"], {}), false);
  assert.equal(fortuneTellerYes(fortune, ["1"], { "1": "demon" }), true);
});


test("Fortune Teller may choose themself and dead players", () => {
  const state = make({
    "1": "fortuneteller", "2": "chef", "3": "empath", "4": "monk",
    "5": "soldier", "6": "poisoner", "7": "imp"
  });
  state.setup.herringId = "3";
  startNight(state);
  const step = roleStep(state, "fortuneteller");
  assert.equal(step.targetMode, "two");
  const selfAndChef = completeStep(state, step.key, { targetIds: ["1", "2"] });
  assert.equal(selfAndChef.ok, true, "selecting themself is allowed");
  assert.equal(selfAndChef.step.given.value, false);
  assert.equal(step.impaired, false);
});

test("the Fortune Teller may be their own red herring", () => {
  const state = make({
    "1": "fortuneteller", "2": "chef", "3": "empath", "4": "monk",
    "5": "soldier", "6": "poisoner", "7": "imp"
  });
  state.setup.herringId = "1";
  assert.equal(secretsErrors(state).some((error) => error.code === "herring-self"), false,
    "self red herring is a legal setup");
  assert.equal(fortuneTellerYes(state, ["1", "2"], {}), true, "choosing themself reads the herring");
});

test("Fortune Teller may pair a dead player with themself", () => {
  const state = make({
    "1": "fortuneteller", "2": "chef", "3": "empath", "4": "monk",
    "5": "soldier", "6": "poisoner", "7": "imp"
  });
  state.setup.herringId = "3";
  startNight(state);
  kill(state, "2", "test");
  const step = roleStep(state, "fortuneteller");
  const result = completeStep(state, step.key, { targetIds: ["1", "2"] });
  assert.equal(result.ok, true);
  assert.equal(result.step.given.value, false);
  assert.equal(fortuneTellerYes(state, ["1", "3"], {}), true, "the red herring still answers yes");
});

test("one-of-two setup rejects a pair without the real role", () => {
  const state = make({
    "1": "washerwoman", "2": "chef", "3": "empath", "4": "monk",
    "5": "undertaker", "6": "poisoner", "7": "imp"
  });
  state.setup.info.washerwoman = { roleId: "chef", pair: ["1", "3"], matchIndex: 0 };
  assert.ok(secretsErrors(state).some((error) => error.code === "info-true-washerwoman"));
});

test("an illegal Butler vote is counted and only warned about privately", () => {
  const state = make({
    "1": "butler", "2": "chef", "3": "empath", "4": "monk", "5": "soldier",
    "6": "virgin", "7": "poisoner", "8": "imp"
  });
  startNight(state);
  completeSystem(state, "minioninfo");
  completeSystem(state, "demoninfo");
  completeRole(state, "poisoner", { targetIds: ["5"] });
  completeRole(state, "chef");
  completeRole(state, "empath");
  completeRole(state, "butler", { targetIds: ["2"] });
  skipNight(state);
  openNominations(state);
  const nomination = appoint(state, "1", "2", ["1"]);
  assert.equal(nomination.count, 1, "the vote that was cast still counts");
  assert.deepEqual(nomination.votes, ["1"]);
  assert.ok(nomination.butlerWarning.some((warning) => warning.includes("Дворецкий")),
    "the host still gets a private warning");
});

test("a Butler vote counts normally when the master votes too", () => {
  const state = make({
    "1": "butler", "2": "chef", "3": "empath", "4": "monk", "5": "soldier",
    "6": "virgin", "7": "poisoner", "8": "imp"
  });
  startNight(state);
  completeSystem(state, "minioninfo");
  completeSystem(state, "demoninfo");
  completeRole(state, "poisoner", { targetIds: ["5"] });
  completeRole(state, "chef");
  completeRole(state, "empath");
  completeRole(state, "butler", { targetIds: ["2"] });
  skipNight(state);
  openNominations(state);
  const nomination = appoint(state, "1", "2", ["1", "2"]);
  assert.equal(nomination.count, 2);
  assert.deepEqual(nomination.votes, ["1", "2"]);
  assert.equal(nomination.butlerWarning.length, 0);
});

test("a player killed before their night wake is skipped", () => {
  const state = make({
    "1": "empath", "2": "chef", "3": "monk", "4": "soldier",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["5"] });
  completeRole(state, "imp", { targetIds: ["1"] });
  const empath = state.night.queue.find((step) => step.roleId === "empath");
  assert.equal(empath.skipped, true);
  assert.notEqual(currentStep(state) && currentStep(state).roleId, "empath");
});

test("a minion promoted to Demon loses their old night step", () => {
  const state = make({
    "1": "chef", "2": "empath", "3": "monk", "4": "soldier", "5": "mayor",
    "6": "virgin", "7": "slayer", "8": "spy", "9": "poisoner", "10": "imp"
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  const imp = roleStep(state, "imp");
  const attack = completeStep(state, imp.key, { targetIds: ["10"] });
  assert.equal(attack.ok, true);
  assert.ok(state.night.queue.find((step) => step.roleId === "imp").pending);
  const heir = chooseDemonHeir(state, imp.key, "8");
  assert.equal(heir.ok, true);
  assert.equal(state.players["8"].roleId, "imp");
  assert.equal(state.night.queue.find((step) => step.roleId === "spy").skipped, true);
});


test("the host execution result needs no nomination ledger", () => {
  const state = make({
    "1": "chef", "2": "empath", "3": "monk", "4": "soldier",
    "5": "mayor", "6": "poisoner", "7": "imp"
  });
  toDay(state);
  const before = state.deaths.length;
  const result = executeByDecision(state, "2");
  assert.equal(result.ok, true);
  assert.equal(state.deaths.length, before + 1);
  assert.equal(state.day.execution.playerId, "2");
  assert.equal(state.day.execution.deathId, result.death.id);
  assert.equal(state.day.ended, true);
  assert.equal(state.winner, null);
});

test("table Virgin control spends a non-triggering nomination without opening a vote ledger", () => {
  const state = make({ "1": "virgin", "2": "drunk", "3": "chef", "4": "empath", "5": "monk", "6": "poisoner", "7": "imp", "8": "undertaker" }, { drunkShownId: "soldier" });
  toDay(state);
  const result = recordVirginNomination(state, "2", "1");
  assert.equal(result.ok, true);
  assert.equal(state.players["1"].used.virgin, true);
  assert.equal(state.day.execution, null);
  assert.equal(state.day.activeNominationId, null);
  assert.equal(recordVirginNomination(state, "3", "1").ok, false);
  const roundtrip = importGame(exportGame(state));
  assert.equal(roundtrip.ok, true, roundtrip.error);
  assert.equal(roundtrip.state.players["1"].used.virgin, true);
});

test("table Virgin control executes a qualifying nominator and persists the death reference", () => {
  const state = make({ "1": "virgin", "2": "chef", "3": "empath", "4": "monk", "5": "undertaker", "6": "poisoner", "7": "imp" });
  toDay(state);
  const result = recordVirginNomination(state, "2", "1");
  assert.equal(result.virgin, true);
  assert.equal(state.day.ended, true);
  assert.equal(state.players["2"].alive, false);
  assert.ok(state.day.execution.deathId);
  assert.equal(importGame(exportGame(state)).ok, true);
});

test("claim recovery clears only the selected claim and records a reason", () => {
  const state = make({ "1": "virgin", "2": "chef", "3": "empath", "4": "monk", "5": "undertaker", "6": "poisoner", "7": "imp" });
  state.players["1"].claimed = true;
  state.players["2"].claimed = true;
  const role = state.players["1"].roleId;
  assert.equal(recoverClaim(state, "1", "Mistaken number").ok, true);
  assert.equal(state.players["1"].claimed, false);
  assert.equal(state.players["1"].name, "");
  assert.equal(state.players["1"].roleId, role);
  assert.equal(state.players["2"].claimed, true);
  assert.equal(state.corrections.at(-1).reason, "Mistaken number");
});
