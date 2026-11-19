import test from "node:test";
import assert from "node:assert/strict";
import { createGame, publicGameView, livingPlayers, orderedPlayers } from "../model/state.ts";
import {
  ALL_ROLES,
  bagErrors,
  compositionFor,
  isGoodRole,
  randomBag,
  roleTeam,
} from "../model/rules.ts";
import {
  applyCommand,
  autoSecrets,
  chooseDemonHeir,
  completeStep,
  currentStep,
  dealGame,
  endDay,
  endNight,
  execute,
  executeByDecision,
  infoForStep,
  kill,
  isImpaired,
  nominate,
  openNominations,
  previewCommand,
  recordVotes,
  replay,
  skipStep,
  startNight,
  useSlayer,
  butlerMaster,
  fortuneTellerYes,
  canonicalState,
  createRuntime,
} from "./index.ts";
import type { GameState, NightStep, RoleId } from "../model/types.ts";

// Independent Trouble Brewing audit fixtures. These tests derive their
// expected outcome from the pinned official text, not from the engine's
// existing assertions.

function auditGame(
  assignment: Record<string, string>,
  options: { drunkShownId?: RoleId | null; count?: number } = {},
): GameState {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  for (const id of Object.keys(assignment)) state.players[id]!.name = "P" + id;
  const roles = [...new Set(Object.values(assignment))] as RoleId[];
  state.setup.count = count;
  state.setup.roles = roles;
  const bluffPool = ALL_ROLES.filter(
    (id) => isGoodRole(id) && !roles.includes(id) && id !== options.drunkShownId,
  );
  state.setup.bluffs = count >= 7 ? bluffPool.slice(0, 3) : [];
  state.setup.drunkShownId = options.drunkShownId || null;
  const result = dealGame(state, { assignment });
  assert.equal(result.ok, true, JSON.stringify(result));
  autoSecrets(state);
  return state;
}

function roleStep(state: GameState, roleId: string): NightStep {
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === roleId && !candidate.done,
  );
  assert.ok(step, "no step for " + roleId);
  return step;
}

function pendingOptionIds(step: NightStep): string[] {
  const options = step.pending?.options;
  if (!Array.isArray(options)) return [];
  return options.flatMap((option) => {
    if (!option || typeof option !== "object" || !("id" in option)) return [];
    return typeof option.id === "string" ? [option.id] : [];
  });
}

function completeRole(state: GameState, roleId: string, options: Record<string, unknown> = {}) {
  const step = roleStep(state, roleId);
  const result = completeStep(state, step.key, options as never);
  assert.equal(result.ok, true, JSON.stringify(result));
  return step;
}

function beginNight(state: GameState): GameState {
  const result = startNight(state);
  assert.equal(result.ok, true, JSON.stringify(result));
  return state;
}

function skipEverything(state: GameState): void {
  while (currentStep(state)) skipStep(state, currentStep(state)!.key, "audit");
  const result = endNight(state);
  assert.equal(result.ok, true, JSON.stringify(result));
}

function nightOneToDay(state: GameState): GameState {
  beginNight(state);
  skipEverything(state);
  return state;
}

function nextNight(state: GameState): GameState {
  const result = endDay(state);
  assert.equal(result.ok, true, JSON.stringify(result));
  return state;
}

function executeByVote(state: GameState, nominatorId: string, nomineeId: string): void {
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, nominatorId, nomineeId);
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  const current = state.day.nominations[state.day.nominations.length - 1]!;
  const voters = livingPlayers(state).map((player) => player.id);
  const votes = recordVotes(state, current.id, voters);
  assert.equal(votes.ok, true, JSON.stringify(votes));
  const executed = execute(state, current.id);
  assert.equal(executed.ok, true, JSON.stringify(executed));
}

const MAYOR_BOARD = {
  1: "mayor",
  2: "soldier",
  3: "monk",
  4: "poisoner",
  5: "imp",
} as const;

test("a sober Chef with no registration ambiguity learns one computed count (TB-CHEF-01)", () => {
  const state = auditGame({
    1: "chef",
    2: "butler",
    3: "empath",
    4: "soldier",
    5: "poisoner",
    6: "imp",
  });
  beginNight(state);
  const step = roleStep(state, "chef");
  const info = infoForStep(state, step, {});
  assert.equal(info.needsChoice, false);
  assert.equal(info.value, 1, "the Poisoner and the Imp are neighbours");
  assert.deepEqual(info.options, []);
});

test("Mayor redirect to a dead player kills nobody and the Mayor lives (TB-MAYOR-01)", () => {
  const state = auditGame(MAYOR_BOARD);
  nightOneToDay(state);
  executeByDecision(state, "3", { cause: "audit" });
  nextNight(state);
  const imp = roleStep(state, "imp");
  const pending = completeStep(state, imp.key, { targetIds: ["1"] });
  assert.equal(pending.ok, false);
  assert.equal("needsRedirect" in pending ? pending.needsRedirect : false, true);
  const result = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "3" });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"]!.alive, true);
  assert.equal(state.players["3"]!.alive, false, "the dead redirect target stays dead");
  assert.equal(state.players["1"]!.roleId, "mayor");
});

test("Mayor redirect to a living player kills that player instead (TB-MAYOR-01)", () => {
  const state = auditGame(MAYOR_BOARD);
  nightOneToDay(state);
  nextNight(state);
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "3" });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"]!.alive, true);
  assert.equal(state.players["3"]!.alive, false);
});

test("choosing that the Mayor dies keeps the Demon attack on the Mayor (TB-MAYOR-01)", () => {
  const state = auditGame(MAYOR_BOARD);
  nightOneToDay(state);
  nextNight(state);
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "none" });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"]!.alive, false);
});

test("a poisoned Mayor neither redirects nor wins at three alive (TB-MAYOR-01)", () => {
  const state = auditGame(MAYOR_BOARD);
  nightOneToDay(state);
  executeByVote(state, "1", "2"); // day 1: four alive
  nextNight(state);
  completeRole(state, "poisoner", { targetIds: ["1"] });
  completeRole(state, "imp", { targetIds: ["3"] }); // night 2: three alive
  skipEverything(state);
  assert.equal(livingPlayers(state).length, 3);
  assert.equal(isImpaired(state, "1"), true);
  endDay(state);
  assert.equal(state.players["1"]!.alive, true);
  assert.equal(state.winner, null, "a drunk or poisoned Mayor has no ability");
});

test("three alive, no execution, and a sober Mayor win for good (TB-MAYOR-01)", () => {
  const state = auditGame(MAYOR_BOARD);
  nightOneToDay(state);
  executeByVote(state, "1", "2"); // day 1: 4 alive
  nextNight(state);
  completeRole(state, "imp", { targetIds: ["3"] }); // night 2: 3 alive
  skipEverything(state);
  assert.equal(livingPlayers(state).length, 3);
  const result = endDay(state);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.winner?.team, "good");
  assert.equal(state.winner?.reason, "mayor");
});

test("an execution of a corpse still blocks the Mayor win (TB-MAYOR-01)", () => {
  const state = auditGame(MAYOR_BOARD);
  nightOneToDay(state);
  executeByVote(state, "1", "2");
  nextNight(state);
  completeRole(state, "imp", { targetIds: ["3"] });
  skipEverything(state);
  assert.equal(livingPlayers(state).length, 3);
  const result = executeByDecision(state, "3", { cause: "corpse" });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.day.execution !== null, true);
  endDay(state);
  assert.equal(state.winner, null);
});

test("Imp self-kill with one Minion passes the Demon role at once (TB-IMP-01)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "imp", { targetIds: ["6"] });
  assert.equal(state.players["6"]!.alive, false);
  assert.equal(state.players["5"]!.roleId, "imp");
  assert.equal(state.winner, null);
});

test("Imp self-kill with two Minions needs the host's heir choice (TB-IMP-01)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "undertaker",
    5: "virgin",
    6: "slayer",
    7: "mayor",
    8: "poisoner",
    9: "spy",
    10: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["10"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(pendingOptionIds(imp).sort(), ["8", "9"], "the host must choose an heir");
  const heir = chooseDemonHeir(state, imp.key, "9");
  assert.equal(heir.ok, true, JSON.stringify(heir));
  assert.equal(state.players["9"]!.roleId, "imp");
});

test("Scarlet Woman inherits a Demon executed with five or more alive (TB-SCARLETWOMAN-01)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "scarletwoman",
    5: "imp",
  });
  nightOneToDay(state);
  executeByVote(state, "1", "5");
  assert.equal(state.players["5"]!.alive, false);
  assert.equal(state.players["4"]!.roleId, "imp");
  assert.equal(state.winner, null);
});

test("Scarlet Woman does not inherit a Demon executed with fewer than five alive (TB-SCARLETWOMAN-01)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "scarletwoman",
    5: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "imp", { targetIds: ["1"] }); // four alive
  skipEverything(state);
  executeByVote(state, "2", "5"); // four alive before the death
  assert.equal(livingPlayers(state).length, 3);
  assert.equal(state.players["5"]!.alive, false);
  assert.equal(state.players["4"]!.roleId, "scarletwoman");
  assert.equal(state.winner?.team, "good");
  assert.equal(state.winner?.reason, "demon-dead");
});

test("a Slayer kills a Recluse that registers as the Demon without ending the game (TB-SLAYER-01, TB-RECLUSE-02)", () => {
  const state = auditGame({
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "recluse",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  const result = useSlayer(state, "1", "4", { recluseRegistersDemon: true });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.hit, true);
  assert.equal(state.players["4"]!.alive, false);
  assert.equal(state.winner, null, "the real Demon is still alive");
});

test("a Slayer kill on the real Demon wins for good unless an heir exists (TB-SLAYER-01)", () => {
  const state = auditGame({
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  const result = useSlayer(state, "1", "6");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.hit, true);
  assert.equal(state.winner?.team, "good");
});

test("a Drunk shown the Slayer can make one apparent shot without killing (TB-DRUNK-01, TB-SLAYER-01)", () => {
  const state = auditGame(
    { 1: "drunk", 2: "chef", 3: "empath", 4: "soldier", 5: "poisoner", 6: "imp" },
    { drunkShownId: "slayer" },
  );
  nightOneToDay(state);

  assert.equal(useSlayer(state, "1", "missing").errorCode, "error.31");
  const result = useSlayer(state, "1", "6");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.hit, false);
  assert.equal(state.players["1"]!.used.slayer, true);
  assert.equal(state.players["6"]!.alive, true);
  assert.equal(useSlayer(state, "1", "6").errorCode, "error.30");
});

test("a poisoned Slayer spends the once-per-game ability without killing (TB-SLAYER-01)", () => {
  const state = auditGame({
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "poisoner", { targetIds: ["1"] });
  skipEverything(state);
  const result = useSlayer(state, "1", "6");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.hit, false);
  assert.equal(state.players["6"]!.alive, true);
  assert.equal(state.players["1"]!.used.slayer, true);
});

test("a Spy registering as a Townsfolk triggers the Virgin and dies at once (TB-VIRGIN-01, TB-SPY-01)", () => {
  const state = auditGame({
    1: "virgin",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "spy",
    6: "imp",
  });
  nightOneToDay(state);
  assert.equal(openNominations(state).ok, true);
  const result = nominate(state, "5", "1", { spyRegistersTownsfolk: true });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["5"]!.alive, false);
  assert.equal(state.day.execution?.playerId, "5");
  assert.equal(state.day.ended, true);
  assert.equal(state.players["1"]!.used.virgin, true);
});

test("a Spy that does not register as a Townsfolk leaves the Virgin alive but spent (TB-VIRGIN-01)", () => {
  const state = auditGame({
    1: "virgin",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "spy",
    6: "imp",
  });
  nightOneToDay(state);
  assert.equal(openNominations(state).ok, true);
  const result = nominate(state, "5", "1");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["5"]!.alive, true);
  assert.equal(state.day.execution, null);
  assert.equal(state.players["1"]!.used.virgin, true);
});

test("a Drunk nominator does not trigger the Virgin (TB-VIRGIN-01, TB-DRUNK-01)", () => {
  const state = auditGame(
    {
      1: "virgin",
      2: "chef",
      3: "empath",
      4: "drunk",
      5: "spy",
      6: "imp",
    },
    { drunkShownId: "undertaker" },
  );
  nightOneToDay(state);
  assert.equal(openNominations(state).ok, true);
  const result = nominate(state, "4", "1");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["4"]!.alive, true);
  assert.equal(state.day.execution, null);
  assert.equal(state.players["1"]!.used.virgin, true);
});

test("an executed Saint loses for good; a Saint killed at night does not (TB-SAINT-01)", () => {
  const executed = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "saint",
    5: "scarletwoman",
    6: "imp",
  });
  nightOneToDay(executed);
  executeByVote(executed, "1", "4");
  assert.equal(executed.winner?.team, "evil");
  assert.equal(executed.winner?.reason, "saint");

  const atNight = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "saint",
    5: "scarletwoman",
    6: "imp",
  });
  nightOneToDay(atNight);
  nextNight(atNight);
  completeRole(atNight, "imp", { targetIds: ["4"] });
  assert.equal(atNight.players["4"]!.alive, false);
  assert.equal(atNight.winner, null);
});

test("Monk protection stops the Imp; a poisoned Monk does not (TB-MONK-01)", () => {
  const state = auditGame({
    1: "monk",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "monk", { targetIds: ["2"] });
  completeRole(state, "imp", { targetIds: ["2"] });
  assert.equal(state.players["2"]!.alive, true);

  const poisoned = auditGame({
    1: "monk",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(poisoned);
  nextNight(poisoned);
  completeRole(poisoned, "poisoner", { targetIds: ["1"] });
  completeRole(poisoned, "monk", { targetIds: ["2"] });
  completeRole(poisoned, "imp", { targetIds: ["2"] });
  assert.equal(poisoned.players["2"]!.alive, false);
});

test("the Monk cannot protect themself (TB-MONK-01)", () => {
  const state = auditGame({
    1: "monk",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  const step = roleStep(state, "monk");
  const result = completeStep(state, step.key, { targetIds: ["1"] });
  assert.equal(result.ok, false);
  assert.equal("errorCode" in result ? result.errorCode : null, "error.40");
});

test("the Soldier is safe from the Imp while sober and dies while poisoned (TB-SOLDIER-01)", () => {
  const sober = auditGame({
    1: "soldier",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(sober);
  nextNight(sober);
  completeRole(sober, "imp", { targetIds: ["1"] });
  assert.equal(sober.players["1"]!.alive, true);

  const poisoned = auditGame({
    1: "soldier",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(poisoned);
  nextNight(poisoned);
  completeRole(poisoned, "poisoner", { targetIds: ["1"] });
  completeRole(poisoned, "imp", { targetIds: ["1"] });
  assert.equal(poisoned.players["1"]!.alive, false);
});

test("poison lasts tonight and the next day and ends at the next dusk (TB-POISONER-01)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  beginNight(state);
  completeRole(state, "poisoner", { targetIds: ["1"] });
  assert.equal(isImpaired(state, "1"), true, "poisoned tonight");
  skipEverything(state);
  assert.equal(isImpaired(state, "1"), true, "poisoned during tomorrow's day");
  nextNight(state);
  assert.equal(isImpaired(state, "1"), false, "healthy again after dusk");
});

test("a Baron adds two Outsiders and the Drunk keeps a false Townsfolk identity (TB-BARON-01, TB-DRUNK-01)", () => {
  const state = auditGame(
    {
      1: "chef",
      2: "drunk",
      3: "saint",
      4: "baron",
      5: "imp",
    },
    { drunkShownId: "empath" },
  );
  const composition = compositionFor(5, ["chef", "drunk", "saint", "baron", "imp"])!;
  assert.deepEqual(composition, { townsfolk: 1, outsider: 2, minion: 1, demon: 1 });
  assert.equal(state.players["2"]!.roleId, "drunk");
  assert.equal(state.players["2"]!.shownRoleId, "empath");
  assert.equal(isImpaired(state, "2"), true);
  beginNight(state);
  const empath = roleStep(state, "empath");
  assert.equal(empath.actorId, "2", "the Drunk takes the shown Empath's step");
});

test("the Ravenkeeper wakes only after a night death, never after an execution (TB-RAVENKEEPER-01)", () => {
  const state = auditGame({
    1: "ravenkeeper",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "imp", { targetIds: ["1"] });
  const step = roleStep(state, "ravenkeeper");
  assert.equal(step.actorId, "1");
  assert.equal(step.actorAlive, false);

  const executed = auditGame({
    1: "ravenkeeper",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(executed);
  executeByVote(executed, "2", "1");
  nextNight(executed);
  assert.equal(
    executed.night.queue.some((candidate) => candidate.roleId === "ravenkeeper"),
    false,
  );
});

test("the Undertaker wakes after an execution death and not after a night death (TB-UNDERTAKER-01)", () => {
  const state = auditGame({
    1: "undertaker",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  executeByVote(state, "2", "4");
  nextNight(state);
  const step = roleStep(state, "undertaker");
  const info = infoForStep(state, step, {});
  assert.equal(info.roleId, "butler");

  const nightDeath = auditGame({
    1: "undertaker",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(nightDeath);
  nextNight(nightDeath);
  completeRole(nightDeath, "imp", { targetIds: ["4"] });
  assert.equal(
    nightDeath.night.queue.some(
      (candidate) => candidate.roleId === "undertaker" && !candidate.done,
    ),
    false,
  );
});

test("the Empath counts a Spy registering good and a Recluse registering evil without changing their roles (TB-EMPATH-02)", () => {
  const state = auditGame({
    1: "empath",
    2: "spy",
    3: "imp",
    4: "chef",
    5: "soldier",
    6: "recluse",
  });
  beginNight(state);
  const step = roleStep(state, "empath");
  assert.deepEqual(infoForStep(state, step, {}).value, 1, "Spy evil + Recluse good");
  assert.deepEqual(
    infoForStep(state, step, { registrations: { "2": "good", "6": "evil" } }).value,
    1,
  );
  assert.equal(state.players["2"]!.roleId, "spy");
  assert.equal(state.players["2"]!.team, "evil");
  assert.equal(state.players["6"]!.roleId, "recluse");
  assert.equal(state.players["6"]!.team, "good");
});

test("the Chef's count is a host registration choice and alters no role (TB-CHEF-02)", () => {
  const state = auditGame({
    1: "spy",
    2: "recluse",
    3: "chef",
    4: "empath",
    5: "soldier",
    6: "imp",
  });
  beginNight(state);
  const step = roleStep(state, "chef");
  const info = infoForStep(state, step, {});
  assert.equal(info.needsChoice, true);
  assert.deepEqual(info.options, [0, 1, 2]);
  const result = completeStep(state, step.key, { given: { kind: "number", value: 1 } });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"]!.roleId, "spy");
  assert.equal(state.players["2"]!.roleId, "recluse");
  assert.equal(state.players["1"]!.team, "evil");
  assert.equal(state.players["2"]!.team, "good");
});

test("the public game view exposes no hidden role or setup secret (TB-SPY-01, TB-DRUNK-01)", () => {
  const state = auditGame(
    {
      1: "chef",
      2: "drunk",
      3: "saint",
      4: "baron",
      5: "imp",
    },
    { drunkShownId: "empath" },
  );
  const view = JSON.stringify(publicGameView(state));
  for (const secret of ["empath", "baron", "imp", "saint", "roleId", "shownRoleId", "herring"]) {
    assert.equal(view.includes(secret), false, "public view leaks " + secret);
  }
});

test("preview, apply and replay agree on a Slayer shot with a seeded clock (TB-SLAYER-01)", () => {
  const state = auditGame({
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  const runtime = createRuntime({ now: () => new Date("2030-01-01T00:00:00.000Z") });
  const command = {
    id: "audit-slayer",
    type: "useSlayer",
    payload: { slayerId: "1", targetId: "6" },
    at: "2030-01-01T00:00:00.000Z",
  } as const;
  const preview = previewCommand(state, command, runtime);
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  const applied = applyCommand(state, command, runtime);
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.equal(state.players["6"]!.alive, false);
  const replayed = replay(state.journal!, runtime);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (replayed.ok) {
    assert.deepEqual(canonicalState(replayed.state), canonicalState(state));
  }
});

function seeded(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function fillDrunkInfo(state: GameState): void {
  const drunk = orderedPlayers(state).find((player) => player.roleId === "drunk");
  const shown = drunk?.shownRoleId;
  if (!drunk || (shown !== "washerwoman" && shown !== "librarian" && shown !== "investigator")) {
    return;
  }
  const pair = orderedPlayers(state)
    .filter((player) => player.id !== drunk.id)
    .slice(0, 2)
    .map((player) => player.id) as [string, string];
  const roleId: RoleId =
    shown === "washerwoman" ? "chef" : shown === "librarian" ? "saint" : "poisoner";
  if (shown === "washerwoman") {
    state.setup.info.washerwoman = { forDrunk: true, roleId, pair };
  } else if (shown === "librarian") {
    state.setup.info.librarian = { forDrunk: true, roleId, pair };
  } else {
    state.setup.info.investigator = { forDrunk: true, roleId, pair };
  }
}

test("every Trouble Brewing size from 5 to 15 produces a legal bag and a playable first night (SYS-SETUP-02)", () => {
  for (let count = 5; count <= 15; count += 1) {
    for (const seed of [1, 2, 3]) {
      const bag = randomBag(count, seeded(seed + count * 10), ALL_ROLES);
      assert.deepEqual(
        bagErrors({
          count,
          roles: bag.roles,
          bluffs: bag.bluffs,
          drunkShownId: bag.drunkShownId,
          pool: ALL_ROLES,
        }),
        [],
        "count " + count + " seed " + seed,
      );
      const state = createGame(count);
      state.setup.count = count;
      state.setup.roles = bag.roles;
      state.setup.bluffs = bag.bluffs;
      state.setup.drunkShownId = bag.drunkShownId;
      const dealt = dealGame(state);
      assert.equal(dealt.ok, true, JSON.stringify(dealt));
      autoSecrets(state);
      fillDrunkInfo(state);
      const night = startNight(state);
      assert.equal(
        night.ok,
        true,
        "count " + count + " seed " + seed + ": " + JSON.stringify(night),
      );
    }
  }
});

test("the first-night order places the Poisoner before the information roles and the Spy last (SYS-NIGHT-01)", () => {
  const state = auditGame({
    1: "washerwoman",
    2: "librarian",
    3: "investigator",
    4: "chef",
    5: "empath",
    6: "fortuneteller",
    7: "monk",
    8: "butler",
    9: "poisoner",
    10: "spy",
    11: "imp",
  });
  beginNight(state);
  assert.deepEqual(
    state.night.queue.filter((step) => step.roleId).map((step) => step.roleId),
    [
      "poisoner",
      "washerwoman",
      "librarian",
      "investigator",
      "chef",
      "empath",
      "fortuneteller",
      "butler",
      "spy",
    ],
  );
  assert.equal(
    state.night.queue.some((step) => step.system === "minioninfo"),
    true,
  );
  assert.equal(
    state.night.queue.some((step) => step.system === "demoninfo"),
    true,
  );
});

test("the other-night order places the Monk before the Imp and the Spy last (SYS-NIGHT-01)", () => {
  const state = auditGame({
    1: "washerwoman",
    2: "librarian",
    3: "investigator",
    4: "chef",
    5: "empath",
    6: "fortuneteller",
    7: "monk",
    8: "butler",
    9: "poisoner",
    10: "spy",
    11: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  assert.deepEqual(
    state.night.queue.filter((step) => step.roleId).map((step) => step.roleId),
    ["poisoner", "monk", "imp", "empath", "fortuneteller", "butler", "spy"],
  );
});

test("five or six players get no Minion or Demon introduction (SYS-SETUP-04)", () => {
  const six = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  beginNight(six);
  assert.equal(
    six.night.queue.some((step) => step.system === "minioninfo"),
    false,
  );
  assert.equal(
    six.night.queue.some((step) => step.system === "demoninfo"),
    false,
  );
});

test("the Washerwoman learns a Townsfolk and the Drunk shown the role receives a chosen false pair (TB-WASHERWOMAN-01, TB-DRUNK-01)", () => {
  const state = auditGame({
    1: "washerwoman",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  beginNight(state);
  const info = infoForStep(state, roleStep(state, "washerwoman"), {});
  assert.equal(info.kind, "one-of-two");
  assert.equal(roleTeam(info.roleId!), "townsfolk");
  assert.equal(info.pair!.length, 2);
  assert.equal(info.needsChoice, false);

  const drunk = auditGame(
    {
      1: "drunk",
      2: "chef",
      3: "empath",
      4: "soldier",
      5: "spy",
      6: "imp",
    },
    { drunkShownId: "washerwoman" },
  );
  drunk.setup.info.washerwoman = { forDrunk: true, roleId: "chef", pair: ["2", "4"] };
  const started = startNight(drunk);
  assert.equal(started.ok, true, JSON.stringify(started));
  const step = roleStep(drunk, "washerwoman");
  assert.equal(step.actorId, "1");
  const falseInfo = infoForStep(drunk, step, {});
  assert.equal(falseInfo.impaired, true);
  assert.equal(falseInfo.needsChoice, true);
  assert.deepEqual(
    falseInfo.options,
    ALL_ROLES.filter((id) => roleTeam(id) === "townsfolk"),
    "a Washerwoman answer is still a Townsfolk",
  );
});

test("the Librarian may learn zero with no Outsider and a pair otherwise (TB-LIBRARIAN-01)", () => {
  const zero = auditGame({
    1: "librarian",
    2: "chef",
    3: "empath",
    4: "poisoner",
    5: "imp",
  });
  beginNight(zero);
  assert.deepEqual(zero.setup.info.librarian, { zero: true, pair: [] });
  const zeroInfo = infoForStep(zero, roleStep(zero, "librarian"), {});
  assert.equal(zeroInfo.zero, true);

  const pair = auditGame({
    1: "librarian",
    2: "chef",
    3: "empath",
    4: "saint",
    5: "poisoner",
    6: "imp",
  });
  beginNight(pair);
  const pairInfo = infoForStep(pair, roleStep(pair, "librarian"), {});
  assert.equal(pairInfo.zero, undefined);
  assert.equal(roleTeam(pairInfo.roleId!), "outsider");
  assert.equal(pairInfo.pair!.length, 2);
});

test("the Investigator learns a Minion and a Recluse may be the prepared Minion (TB-INVESTIGATOR-01, TB-RECLUSE-02)", () => {
  const state = auditGame({
    1: "investigator",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  beginNight(state);
  const info = infoForStep(state, roleStep(state, "investigator"), {});
  assert.equal(info.kind, "one-of-two");
  assert.equal(info.roleId, "poisoner");
  assert.equal(info.pair!.length, 2);

  const recluse = auditGame({
    1: "investigator",
    2: "chef",
    3: "empath",
    4: "recluse",
    5: "poisoner",
    6: "imp",
  });
  recluse.setup.info.investigator = { roleId: "poisoner", pair: ["4", "6"], matchIndex: 0 };
  const started = startNight(recluse);
  assert.equal(started.ok, true, JSON.stringify(started));
  assert.equal(
    infoForStep(recluse, roleStep(recluse, "investigator"), {}).roleId,
    "poisoner",
    "the Recluse may register as the shown Minion",
  );
});

test("the Fortune Teller says yes for a Demon, the red herring and a Recluse registered as a Demon (TB-FORTUNETELLER-01, TB-RECLUSE-02)", () => {
  const state = auditGame({
    1: "fortuneteller",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "spy",
    6: "imp",
  });
  beginNight(state);
  const step = roleStep(state, "fortuneteller");
  assert.equal(infoForStep(state, step, { targetIds: ["5", "6"] }).value, true);
  assert.equal(infoForStep(state, step, { targetIds: ["3", "4"] }).value, false);
  assert.equal(infoForStep(state, step, { targetIds: ["2", "3"] }).value, true, "the herring");
  assert.equal(infoForStep(state, step, { targetIds: ["1", "3"] }).value, false, "self is legal");

  const recluse = auditGame({
    1: "fortuneteller",
    2: "chef",
    3: "empath",
    4: "recluse",
    5: "spy",
    6: "imp",
  });
  beginNight(recluse);
  const recluseStep = roleStep(recluse, "fortuneteller");
  assert.equal(
    infoForStep(recluse, recluseStep, { targetIds: ["4", "3"], registrations: { "4": "demon" } })
      .value,
    true,
  );
  assert.equal(infoForStep(recluse, recluseStep, { targetIds: ["4", "3"] }).value, false);
  assert.equal(fortuneTellerYes(recluse, ["4"], { "4": "demon" }), true);
});

test("the Butler restricts tomorrow's vote to a master's vote and expires at the next dusk (TB-BUTLER-01)", () => {
  const state = auditGame({
    1: "butler",
    2: "chef",
    3: "empath",
    4: "soldier",
    5: "poisoner",
    6: "imp",
  });
  beginNight(state);
  completeRole(state, "butler", { targetIds: ["2"] });
  skipEverything(state);
  assert.equal(butlerMaster(state, "1"), "2");
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "4", "6");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  const current = state.day.nominations[state.day.nominations.length - 1]!;
  assert.equal(recordVotes(state, current.id, ["1"]).ok, true);
  assert.deepEqual(current.butlerWarning, [
    "Дворецкий голосует без своего хозяина: голос учтён, нарушение видит только ведущий.",
  ]);
  nextNight(state);
  assert.equal(butlerMaster(state, "1"), null, "the restriction covers only the next day");
});

test("a Monk protecting the Imp stops its self-kill and creates no new Demon (TB-MONK-01, TB-IMP-01)", () => {
  const state = auditGame({
    1: "monk",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "monk", { targetIds: ["6"] });
  const result = completeStep(state, roleStep(state, "imp").key, { targetIds: ["6"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["6"]!.alive, true, "the protected Imp cannot die");
  assert.equal(state.players["5"]!.roleId, "poisoner", "no Minion becomes the Demon");
});

test("a Mayor redirect to the Ravenkeeper wakes the Ravenkeeper that night (TB-MAYOR-01, TB-RAVENKEEPER-01)", () => {
  const state = auditGame({
    1: "mayor",
    2: "ravenkeeper",
    3: "chef",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "2" });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"]!.alive, true);
  assert.equal(state.players["2"]!.alive, false);
  const ravenkeeper = roleStep(state, "ravenkeeper");
  assert.equal(ravenkeeper.actorId, "2");
});

test("an Outsider nominator, including the Saint, does not trigger the Virgin (TB-VIRGIN-01)", () => {
  const state = auditGame({
    1: "virgin",
    2: "saint",
    3: "chef",
    4: "empath",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  assert.equal(openNominations(state).ok, true);
  const result = nominate(state, "2", "1");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["2"]!.alive, true);
  assert.equal(state.day.execution, null);
  assert.equal(state.players["1"]!.used.virgin, true);
  assert.equal(state.winner, null);
});

const TEN_MINIONS = {
  1: "chef",
  2: "empath",
  3: "soldier",
  4: "undertaker",
  5: "virgin",
  6: "slayer",
  7: "mayor",
  8: "poisoner",
  9: "scarletwoman",
  10: "imp",
} as const;

test("a Scarlet Woman must inherit an Imp self-kill at ten alive instead of a host choice (TB-SCARLETWOMAN-01, TB-IMP-01)", () => {
  const state = auditGame(TEN_MINIONS);
  nightOneToDay(state);
  nextNight(state);
  skipStep(state, roleStep(state, "poisoner").key, "audit");
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["10"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["9"]!.roleId, "imp", "the Scarlet Woman inherits first");
  assert.equal(state.players["8"]!.roleId, "poisoner");
  assert.equal(imp.pending, null, "no host choice is owed");
});

test("a poisoned Scarlet Woman leaves the Imp self-kill to the host (TB-SCARLETWOMAN-01, TB-POISONER-01)", () => {
  const state = auditGame(TEN_MINIONS);
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "poisoner", { targetIds: ["9"] });
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["10"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(pendingOptionIds(imp).sort(), ["8", "9"]);
  assert.equal(chooseDemonHeir(state, imp.key, "8").ok, true);
  assert.equal(state.players["8"]!.roleId, "imp");
});

test("a poisoned Scarlet Woman cannot inherit an executed Demon at ten alive (TB-SCARLETWOMAN-01, TB-POISONER-01)", () => {
  const state = auditGame(TEN_MINIONS);
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "poisoner", { targetIds: ["9"] });
  skipStep(state, roleStep(state, "imp").key, "audit");
  skipEverything(state);
  executeByVote(state, "1", "10");
  assert.equal(state.players["9"]!.roleId, "scarletwoman");
  assert.equal(state.winner?.team, "good");
});

test("an Imp self-kill with no living Minion wins for good (TB-IMP-01)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  kill(state, "5", "audit");
  const result = completeStep(state, roleStep(state, "imp").key, { targetIds: ["6"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.winner?.team, "good");
  assert.equal(state.winner?.reason, "demon-dead");
});

test("a Monk-protected Mayor does not redirect the Imp attack (TB-MONK-01, TB-MAYOR-01)", () => {
  const state = auditGame({
    1: "mayor",
    2: "monk",
    3: "chef",
    4: "empath",
    5: "soldier",
    6: "poisoner",
    7: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "monk", { targetIds: ["1"] });
  const result = completeStep(state, roleStep(state, "imp").key, { targetIds: ["1"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"]!.alive, true);
  assert.equal(state.deaths.filter((death) => death.number === 2).length, 0);
});

test("a poisoned Imp cannot kill itself and no new Demon is created (TB-IMP-01, TB-POISONER-01)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "poisoner", { targetIds: ["6"] });
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["6"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["6"]!.alive, true);
  assert.equal(state.players["5"]!.roleId, "poisoner");
});

test("a Slayer shot at five alive lets the Scarlet Woman inherit the Demon role (TB-SLAYER-01, TB-SCARLETWOMAN-01)", () => {
  const state = auditGame({
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "scarletwoman",
    5: "imp",
  });
  nightOneToDay(state);
  const result = useSlayer(state, "1", "5");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["4"]!.roleId, "imp");
  assert.equal(state.winner, null);
});

test("a Slayer shot below five alive ends the game when the Demon has no heir (TB-SLAYER-01)", () => {
  const state = auditGame({
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "scarletwoman",
    5: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "imp", { targetIds: ["2"] });
  skipEverything(state);
  const result = useSlayer(state, "1", "5");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["4"]!.roleId, "scarletwoman");
  assert.equal(state.winner?.team, "good");
});

test("a Mayor redirect to a living Soldier kills nobody (TB-MAYOR-01, TB-SOLDIER-01)", () => {
  const state = auditGame(MAYOR_BOARD);
  nightOneToDay(state);
  nextNight(state);
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "2" });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"]!.alive, true);
  assert.equal(state.players["2"]!.alive, true);
  assert.equal(state.players["2"]!.roleId, "soldier");
});

test("a Mayor redirect to a Monk-protected player kills nobody (TB-MAYOR-01, TB-MONK-01)", () => {
  const state = auditGame(MAYOR_BOARD);
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "monk", { targetIds: ["2"] });
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["1"], redirectId: "2" });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"]!.alive, true);
  assert.equal(state.players["2"]!.alive, true);
});

test("the Undertaker learns the Drunk character, not the shown Townsfolk (TB-UNDERTAKER-01, TB-DRUNK-01)", () => {
  const state = auditGame(
    {
      1: "undertaker",
      2: "chef",
      3: "empath",
      4: "drunk",
      5: "poisoner",
      6: "imp",
    },
    { drunkShownId: "virgin" },
  );
  nightOneToDay(state);
  executeByVote(state, "2", "4");
  nextNight(state);
  assert.equal(infoForStep(state, roleStep(state, "undertaker"), {}).roleId, "drunk");
});

test("the Ravenkeeper may learn a Spy's registered Townsfolk or Outsider character (TB-RAVENKEEPER-01, TB-SPY-01)", () => {
  const state = auditGame({
    1: "ravenkeeper",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "spy",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "imp", { targetIds: ["1"] });
  const step = roleStep(state, "ravenkeeper");
  const info = infoForStep(state, step, { targetIds: ["5"] });
  assert.equal(info.roleId, "spy");
  assert.equal(info.needsChoice, true);
  assert.ok(info.options?.includes("chef"), "a Spy may register as a Townsfolk");
  assert.ok(info.options?.includes("butler"), "a Spy may register as an Outsider");
  const result = completeStep(state, step.key, {
    targetIds: ["5"],
    given: { kind: "character", roleId: "chef" },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["5"]!.roleId, "spy", "the real character does not change");
});

test("a daytime Scarlet Woman succession wakes the new Demon the next night (TB-SCARLETWOMAN-02)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "scarletwoman",
    5: "imp",
  });
  nightOneToDay(state);
  executeByVote(state, "1", "5");
  assert.equal(state.players["4"]!.roleId, "imp");
  nextNight(state);
  assert.equal(
    state.night.queue.some((step) => step.system === "demonchange"),
    true,
  );
  assert.equal(
    state.night.queue.some((step) => step.roleId === "imp" && step.actorId === "4"),
    true,
  );
});

test("a night Scarlet Woman succession wakes the new Demon that night and not again (TB-SCARLETWOMAN-02)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "butler",
    5: "poisoner",
    6: "imp",
  });
  nightOneToDay(state);
  nextNight(state);
  skipStep(state, roleStep(state, "poisoner").key, "audit");
  completeStep(state, roleStep(state, "imp").key, { targetIds: ["6"] });
  assert.equal(state.players["5"]!.roleId, "imp");
  assert.equal(
    state.night.queue.some((step) => step.system === "demonchange"),
    true,
  );
  skipEverything(state);
  nextNight(state);
  assert.equal(
    state.night.queue.some((step) => step.system === "demonchange"),
    false,
    "the wake was already shown the night of the change",
  );
  assert.equal(
    state.night.queue.some((step) => step.roleId === "imp" && step.actorId === "5"),
    true,
  );
});

test("an impaired Saint executed by the town does not lose the game (TB-SAINT-02)", () => {
  const state = auditGame({
    1: "chef",
    2: "empath",
    3: "soldier",
    4: "saint",
    5: "poisoner",
    6: "imp",
  });
  beginNight(state);
  completeRole(state, "poisoner", { targetIds: ["4"] });
  skipEverything(state);
  executeByVote(state, "1", "4");
  assert.equal(state.players["4"]!.alive, false);
  assert.equal(state.winner, null);
});

test("a Drunk shown the Mayor neither redirects nor wins at three alive (TB-DRUNK-01, TB-MAYOR-01)", () => {
  const state = auditGame(
    {
      1: "drunk",
      2: "chef",
      3: "empath",
      4: "soldier",
      5: "spy",
      6: "imp",
    },
    { drunkShownId: "mayor" },
  );
  nightOneToDay(state);
  executeByVote(state, "2", "4");
  nextNight(state);
  completeRole(state, "imp", { targetIds: ["3"] });
  skipEverything(state);
  executeByVote(state, "2", "5");
  nextNight(state);
  skipEverything(state);
  assert.equal(livingPlayers(state).length, 3);
  endDay(state);
  assert.equal(state.winner, null);
});

test("a Drunk shown the Soldier dies to the Imp (TB-DRUNK-01, TB-SOLDIER-01)", () => {
  const state = auditGame(
    {
      1: "drunk",
      2: "chef",
      3: "empath",
      4: "mayor",
      5: "spy",
      6: "imp",
    },
    { drunkShownId: "soldier" },
  );
  nightOneToDay(state);
  nextNight(state);
  completeRole(state, "imp", { targetIds: ["1"] });
  assert.equal(state.players["1"]!.alive, false);
});

test("the Spy sees the Grimoire every night and stores no answer (TB-SPY-01)", () => {
  const state = auditGame({
    1: "spy",
    2: "chef",
    3: "empath",
    4: "butler",
    5: "soldier",
    6: "imp",
  });
  beginNight(state);
  const first = roleStep(state, "spy");
  const result = completeStep(state, first.key, {});
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(first.given?.kind, "grimoire");
  assert.equal(first.given?.value, undefined);
  skipEverything(state);
  nextNight(state);
  assert.equal(
    state.night.queue.some((step) => step.roleId === "spy"),
    true,
  );
});
