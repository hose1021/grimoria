import assert from "node:assert/strict";
import test from "node:test";

import { isImpaired } from "./effects.ts";
import { reconcileNoDashiiPoison } from "./sv.ts";
import {
  appendConditionalSteps,
  applyCommand,
  canonicalState,
  checkWin,
  completeStep,
  createRuntime,
  dayAt,
  kill,
  recordSvOutcome,
  replay,
  resolveDemonDeath,
} from "./index.ts";
import { buildMixedNightQueue } from "./night.ts";
import { createGame } from "../model/state.ts";
import { roleTeam } from "../model/rules.ts";
import type { Command, GameState, RoleId } from "../model/types.ts";
import type { Effect, Script } from "../model/types.ts";

// One pool, three editions, no official jinx. Every character is `verified`
// and every interaction is the shared mechanic, not a pair-specific rule.
const MIXED_SCRIPT: Script = {
  id: "custom-mixed-proof",
  name: "Mixed proof",
  edition: "custom",
  source: "file",
  roles: [
    "soldier",
    "monk",
    "sailor",
    "courtier",
    "clockmaker",
    "poisoner",
    "imp",
    "ravenkeeper",
    "oracle",
    "tealady",
  ],
};

const ASSIGNMENT = {
  "1": "soldier",
  "2": "monk",
  "3": "sailor",
  "4": "courtier",
  "5": "clockmaker",
  "6": "poisoner",
  "7": "imp",
};

const AT = "2030-01-01T00:00:00.000Z";

function startMixedGame() {
  const state = createGame(7);
  const runtime = createRuntime();
  let sent = 0;
  const run = (type: Command["type"], payload: Record<string, unknown> = {}) => {
    const result = applyCommand(
      state,
      { id: "mixed-" + ++sent, type, payload, at: AT } as Command,
      runtime,
    );
    assert.equal(result.status, "allowed", type + ": " + JSON.stringify(result));
    return result;
  };
  run("bagUpdate", {
    patch: {
      script: MIXED_SCRIPT,
      count: 7,
      resetRoster: true,
      roles: Object.values(ASSIGNMENT),
      bluffs: ["ravenkeeper", "oracle", "tealady"],
    },
  });
  run("startGame", { options: { assignment: ASSIGNMENT } });
  return { state, runtime, run };
}

test("a certified mixed script composes one official queue across TB, BMR and S&V (MIXED-QUEUE-01)", () => {
  const { state } = startMixedGame();
  assert.equal(state.phase, "night");
  assert.equal(state.script.manualOnly, false, "a certified mixed script is automatic");
  const roles = state.night.queue.map((step) => step.roleId || step.system);
  assert.deepEqual(roles, [
    "minioninfo",
    "demoninfo",
    "sailor",
    "poisoner",
    "courtier",
    "clockmaker",
  ]);
  const byRole = (id: string) => state.night.queue.find((step) => step.roleId === id);
  assert.equal(byRole("sailor")?.bmr, true);
  assert.equal(byRole("courtier")?.sv, undefined);
  assert.equal(byRole("clockmaker")?.sv, true);
  assert.equal(byRole("poisoner")?.bmr, undefined, "a TB role keeps the shared shape");
  const orders = state.night.queue.map((step) => step.order);
  assert.deepEqual(
    orders,
    [...orders].sort((a, b) => Number(a) - Number(b)),
    "the queue is in official order",
  );
});

test("cross-edition abilities apply through the same effect graph and replay (MIXED-EFFECT-01)", () => {
  const { state, runtime, run } = startMixedGame();
  const step = (id: string) => {
    const found = state.night.queue.find(
      (candidate) => candidate.roleId === id || candidate.system === id,
    );
    assert.ok(found, id + " has no step");
    return found;
  };
  run("completeNightStep", { key: step("minioninfo").key });
  run("completeNightStep", { key: step("demoninfo").key });
  // Sailor (BMR) makes the Clockmaker (S&V) drunk.
  run("completeNightStep", { key: step("sailor").key, targetIds: ["5"], drunkId: "5" });
  assert.equal(isImpaired(state, "5"), true, "the Sailor's drunk lands across editions");
  // Poisoner (TB) poisons the Sailor (BMR).
  run("completeNightStep", { key: step("poisoner").key, targetIds: ["3"] });
  assert.equal(isImpaired(state, "3"), true, "the Poisoner's poison lands across editions");
  // Courtier (BMR) makes every Monk (TB) drunk for three nights.
  run("completeNightStep", { key: step("courtier").key, roleId: "monk" });
  assert.equal(isImpaired(state, "2"), true, "the Courtier's drunk names a TB character");
  // Clockmaker (S&V) learns the distance from the Demon to the nearest Minion.
  run("completeNightStep", {
    key: step("clockmaker").key,
    given: { kind: "number", value: 1 },
  });
  assert.deepEqual(step("clockmaker").given, { kind: "number", value: 1 });

  run("endNight");
  assert.equal(state.phase, "day");
  run("endDay");
  assert.equal(state.phase, "night");
  assert.equal(state.night.number, 2);
  assert.deepEqual(
    state.night.queue.map((entry) => entry.roleId || entry.system),
    ["sailor", "poisoner", "monk", "imp"],
    "night two composes the same editions and keeps the official order",
  );

  const replayed = replay(state.journal, runtime);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (replayed.ok) {
    assert.deepEqual(canonicalState(replayed.state), canonicalState(state));
  }
});

test("an unknown character stays explicitly unsupported (MIXED-SAFETY-01)", () => {
  const state = createGame(7);
  const runtime = createRuntime();
  const bag = ["chef", "empath", "soldier", "ravenkeeper", "klutz", "scarletwoman", "fanggu"];
  const script: Script = {
    id: "custom-mixed-unknown",
    name: "Mixed with an unknown character",
    edition: "custom",
    source: "file",
    roles: [...bag, "notarole"],
  };
  const update = applyCommand(
    state,
    {
      id: "unknown-bag",
      type: "bagUpdate",
      payload: {
        patch: {
          script,
          count: 7,
          resetRoster: true,
          roles: bag,
          bluffs: ["oracle", "tealady", "monk"],
        },
      },
    },
    runtime,
  );
  assert.equal(update.status, "rejected");
  assert.match(JSON.stringify(update), /notarole/);
});

test("the Scarlet Woman inherits the dead Demon's character, not the Imp (MIXED-SUCCESSION-01)", () => {
  const state = createGame(7);
  state.script = {
    id: "custom-mixed-succession",
    name: "Mixed succession",
    edition: "custom",
    roles: ["po", "scarletwoman", "soldier", "monk", "chef", "empath", "clockmaker"],
  };
  state.scriptId = state.script.id;
  state.setup.count = 7;
  state.setup.roles = state.script.roles.slice();
  state.players["1"].roleId = "po";
  state.players["2"].roleId = "scarletwoman";
  state.players["3"].roleId = "soldier";
  state.players["4"].roleId = "monk";
  state.players["5"].roleId = "chef";
  state.players["6"].roleId = "empath";
  state.players["7"].roleId = "clockmaker";
  state.players["1"].alive = false;
  const outcome = resolveDemonDeath(state, {
    playerId: "1",
    roleId: "po",
    cause: "execution",
    livingBefore: 7,
  });
  assert.equal(outcome.inherited, true);
  assert.equal(state.players["2"].roleId, "po", "the heir keeps the dead Demon's character");
  assert.equal(state.players["2"].shownRoleId, "po");
  assert.equal(state.night.demonChanged, true);
});

test("the No Dashii poison respects Soldier and Monk protection (MIXED-PROTECTION-01)", () => {
  const state = createGame(5);
  state.script = {
    id: "custom-mixed-protection",
    name: "Mixed protection",
    edition: "custom",
    roles: ["soldier", "nodashii", "chef", "monk", "empath"],
  };
  state.scriptId = state.script.id;
  state.setup.count = 5;
  state.setup.roles = state.script.roles.slice();
  state.phase = "night";
  state.night.number = 1;
  state.players["1"].roleId = "soldier";
  state.players["2"].roleId = "nodashii";
  state.players["3"].roleId = "chef";
  state.players["4"].roleId = "monk";
  state.players["5"].roleId = "empath";
  const at = { phase: "night" as const, number: 1 };
  state.effects.push({
    id: "eff-monk-chef",
    kind: "protected",
    sourceId: "4",
    targetId: "3",
    start: at,
    expires: { phase: "night", number: 2 },
    active: true,
  } as Effect);
  reconcileNoDashiiPoison(state);
  assert.equal(isImpaired(state, "1", at), false, "the Soldier is safe from the Demon's poison");
  assert.equal(isImpaired(state, "3", at), false, "the Monk's protection stops the poison");
  assert.equal(
    state.effects.some((effect) => effect.nodashii === true && effect.targetId === "1"),
    false,
  );
});

test("a Drunk shown an S&V townsfolk wakes on that role's step (MIXED-DRUNK-01)", () => {
  const state = createGame(6);
  const runtime = createRuntime();
  const script: Script = {
    id: "custom-mixed-drunk",
    name: "Mixed Drunk",
    edition: "custom",
    source: "file",
    roles: ["sailor", "soldier", "monk", "drunk", "poisoner", "imp", "clockmaker"],
  };
  const bag = ["sailor", "soldier", "monk", "drunk", "poisoner", "imp"];
  const update = applyCommand(
    state,
    {
      id: "drunk-bag",
      type: "bagUpdate",
      payload: {
        patch: {
          script,
          count: 6,
          resetRoster: true,
          roles: bag,
          drunkShownId: "clockmaker",
        },
      },
    },
    runtime,
  );
  assert.equal(update.status, "allowed", JSON.stringify(update));
  const started = applyCommand(
    state,
    {
      id: "drunk-start",
      type: "startGame",
      payload: {
        options: {
          assignment: {
            "1": "sailor",
            "2": "soldier",
            "3": "monk",
            "4": "drunk",
            "5": "poisoner",
            "6": "imp",
          },
        },
      },
    },
    runtime,
  );
  assert.equal(started.status, "allowed", JSON.stringify(started));
  const clockmaker = state.night.queue.find((step) => step.roleId === "clockmaker");
  assert.ok(clockmaker, "the Drunk's shown role contributes its step");
  assert.equal(clockmaker.actorId, "4");
});

function mixedVortoxState(firstRole: RoleId = "monk"): GameState {
  const roles: RoleId[] = [
    firstRole,
    "soldier",
    "chef",
    "empath",
    "clockmaker",
    "vortox",
    "poisoner",
  ];
  const assignment: Record<string, RoleId> = {
    "1": firstRole,
    "2": "soldier",
    "3": "chef",
    "4": "empath",
    "5": "clockmaker",
    "6": "vortox",
    "7": "poisoner",
  };
  const state = createGame(7);
  state.script = {
    id: "custom-mixed-protection",
    name: "Mixed protection",
    edition: "custom",
    source: "file",
    roles,
  };
  state.scriptId = state.script.id;
  state.setup.count = 7;
  state.setup.roles = roles.slice();
  state.phase = "night";
  state.night.number = 2;
  for (const [id, roleId] of Object.entries(assignment)) {
    const player = state.players[id];
    player.roleId = roleId;
    player.shownRoleId = roleId;
    player.team = roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good";
  }
  state.night.queue = buildMixedNightQueue(state);
  return state;
}

test("a mixed S&V Demon respects the Monk and the Soldier (MIXED-PROTECTION-02)", () => {
  const at = { phase: "night" as const, number: 2 };
  const monkState = mixedVortoxState();
  monkState.effects.push({
    id: "eff-monk-chef",
    kind: "protected",
    sourceId: "1",
    targetId: "3",
    start: at,
    expires: { phase: "night", number: 3 },
    active: true,
  } as Effect);
  const monkVortox = monkState.night.queue.find((step) => step.roleId === "vortox");
  assert.ok(monkVortox);
  assert.equal(completeStep(monkState, monkVortox.key, { targetIds: ["3"] }).ok, true);
  const monkOutcome = recordSvOutcome(monkState, monkVortox.key, { deathIds: ["3"] });
  assert.equal(monkOutcome.ok, true, JSON.stringify(monkOutcome));
  assert.equal(monkState.players["3"].alive, true, "the Monk's protection stops the Demon");
  assert.ok(
    monkState.log.some((entry) => entry.playerId === "3" && entry.consequence === "prevented"),
    "the prevention is journaled",
  );

  const soldierState = mixedVortoxState();
  const soldierVortox = soldierState.night.queue.find((step) => step.roleId === "vortox");
  assert.ok(soldierVortox);
  assert.equal(completeStep(soldierState, soldierVortox.key, { targetIds: ["2"] }).ok, true);
  const soldierOutcome = recordSvOutcome(soldierState, soldierVortox.key, { deathIds: ["2"] });
  assert.equal(soldierOutcome.ok, true, JSON.stringify(soldierOutcome));
  assert.equal(soldierState.players["2"].alive, true, "the Soldier is safe from the Demon");
  assert.ok(
    kill(soldierState, "2", "ability", at, {}),
    "a mixed non-Demon ability is not the Demon and kills the Soldier",
  );
});

test("a mixed S&V Demon respects the BMR Fool's first death (MIXED-PROTECTION-03)", () => {
  const state = mixedVortoxState("fool");
  const vortox = state.night.queue.find((step) => step.roleId === "vortox");
  assert.ok(vortox);
  assert.equal(completeStep(state, vortox.key, { targetIds: ["1"] }).ok, true);
  const outcome = recordSvOutcome(state, vortox.key, { deathIds: ["1"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(state.players["1"].alive, true, "the Fool's first death is prevented");
  assert.equal(state.players["1"].used?.fool, true, "the Fool's ability is spent");
});

test("a mixed non-Demon ability respects the Innkeeper's protection (MIXED-PROTECTION-04)", () => {
  const state = mixedVortoxState();
  const at = { phase: "night" as const, number: 2 };
  state.effects.push({
    id: "eff-innkeeper-soldier",
    kind: "protected",
    bmr: "innkeeper",
    sourceId: "1",
    targetId: "2",
    start: at,
    expires: { phase: "night", number: 3 },
    active: true,
  } as Effect);
  assert.equal(
    kill(state, "2", "ability", at, {}),
    null,
    "the Innkeeper stops any ability tonight",
  );
  assert.equal(state.players["2"].alive, true);
});

test("a mixed execution respects the Devil's Advocate's protection (MIXED-PROTECTION-05)", () => {
  const state = mixedVortoxState();
  state.phase = "day";
  state.day.number = 2;
  const at = { phase: "day" as const, number: 2 };
  state.effects.push({
    id: "eff-advocate-soldier",
    kind: "devilsadvocate",
    sourceId: "1",
    targetId: "2",
    start: at,
    expires: null,
    active: true,
    day: 2,
  } as Effect);
  assert.equal(kill(state, "2", "execution", at, {}), null, "the Advocate stops the death");
  assert.equal(state.players["2"].alive, true);
});

function mixedFangGuState(): GameState {
  const roles: RoleId[] = ["recluse", "monk", "chef", "empath", "clockmaker", "fanggu", "poisoner"];
  const assignment: Record<string, RoleId> = {
    "1": "recluse",
    "2": "monk",
    "3": "chef",
    "4": "empath",
    "5": "clockmaker",
    "6": "fanggu",
    "7": "poisoner",
  };
  const state = createGame(7);
  state.script = {
    id: "custom-mixed-fanggu",
    name: "Mixed Fang Gu",
    edition: "custom",
    source: "file",
    roles,
  };
  state.scriptId = state.script.id;
  state.setup.count = 7;
  state.setup.roles = roles.slice();
  state.phase = "night";
  state.night.number = 2;
  for (const [id, roleId] of Object.entries(assignment)) {
    const player = state.players[id];
    player.roleId = roleId;
    player.shownRoleId = roleId;
    player.team = roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good";
  }
  state.night.queue = buildMixedNightQueue(state);
  return state;
}

test("a Monk-protected Outsider blocks the Fang Gu jump (MIXED-PROTECTION-06)", () => {
  const state = mixedFangGuState();
  const at = { phase: "night" as const, number: 2 };
  state.effects.push({
    id: "eff-monk-recluse",
    kind: "protected",
    sourceId: "2",
    targetId: "1",
    start: at,
    expires: { phase: "night", number: 3 },
    active: true,
  } as Effect);
  const fanggu = state.night.queue.find((step) => step.roleId === "fanggu" && step.actorId === "6");
  assert.ok(fanggu);
  assert.equal(completeStep(state, fanggu.key, { targetIds: ["1"] }).ok, true);
  const outcome = recordSvOutcome(state, fanggu.key, { deathIds: ["1"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(state.players["1"].alive, true, "the Monk stops the jump");
  assert.equal(state.players["1"].roleId, "recluse");
  assert.equal(state.players["6"].alive, true, "the old Demon survives");
  assert.equal(state.players["6"].roleId, "fanggu");
  assert.equal(state.fangguJumped ?? false, false);
});

test("a living Vortox wins a mixed day with no execution (MIXED-VICTORY-01)", () => {
  const state = mixedVortoxState();
  state.phase = "day";
  state.day.number = 2;
  assert.equal(state.day.execution, null);
  const winner = checkWin(state, { endOfDay: true });
  assert.equal(winner?.team, "evil");
  assert.equal(winner?.reason, "vortox");
});

test("a mixed Mastermind execution arms the extra day (MIXED-VICTORY-02)", () => {
  const roles: RoleId[] = ["mastermind", "imp", "chef", "empath", "soldier", "monk", "clockmaker"];
  const assignment: Record<string, RoleId> = {
    "1": "mastermind",
    "2": "imp",
    "3": "chef",
    "4": "empath",
    "5": "soldier",
    "6": "monk",
    "7": "clockmaker",
  };
  const state = createGame(7);
  state.script = {
    id: "custom-mixed-mastermind",
    name: "Mixed Mastermind",
    edition: "custom",
    source: "file",
    roles,
  };
  state.scriptId = state.script.id;
  state.setup.count = 7;
  state.setup.roles = roles.slice();
  state.phase = "day";
  state.day.number = 2;
  for (const [id, roleId] of Object.entries(assignment)) {
    const player = state.players[id];
    player.roleId = roleId;
    player.shownRoleId = roleId;
    player.team = roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good";
  }
  const death = kill(state, "2", "execution", dayAt(state), {});
  state.day.execution = {
    playerId: "2",
    cause: "vote",
    at: "2030-01-01T00:00:00.000Z",
    nominationId: null,
    deathId: death?.id ?? null,
  };
  const winner = checkWin(state, {});
  assert.equal(winner, null, "the extra day suspends the win");
  assert.equal(state.mastermind?.active, true);
  assert.equal(state.mastermind?.playerId, "1");
});

test("a mixed Barber swaps a TB and an S&V character (MIXED-TRANSFORM-01)", () => {
  const roles: RoleId[] = ["chef", "barber", "clockmaker", "monk", "soldier", "imp", "poisoner"];
  const assignment: Record<string, RoleId> = {
    "1": "chef",
    "2": "barber",
    "3": "clockmaker",
    "4": "monk",
    "5": "soldier",
    "6": "imp",
    "7": "poisoner",
  };
  const state = createGame(7);
  state.script = {
    id: "custom-mixed-barber",
    name: "Mixed Barber",
    edition: "custom",
    source: "file",
    roles,
  };
  state.scriptId = state.script.id;
  state.setup.count = 7;
  state.setup.roles = roles.slice();
  state.phase = "night";
  state.night.number = 2;
  for (const [id, roleId] of Object.entries(assignment)) {
    const player = state.players[id];
    player.roleId = roleId;
    player.shownRoleId = roleId;
    player.team = roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good";
  }
  state.night.queue = buildMixedNightQueue(state);
  assert.ok(
    kill(
      state,
      "2",
      "ability",
      { phase: "night", number: 2 },
      { demon: true, ability: "imp", attackerId: "6" },
    ),
  );
  appendConditionalSteps(state);
  const barber = state.night.queue.find((step) => step.roleId === "barber");
  assert.ok(barber, "the Barber death appends its swap step");
  const result = completeStep(state, barber.key, { targetIds: ["1", "3"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"].roleId, "clockmaker");
  assert.equal(state.players["3"].roleId, "chef");
});
