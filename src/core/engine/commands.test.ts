import test from "node:test";
import assert from "node:assert/strict";
import { ALL_ROLES, isGoodRole, roleTeam } from "../model/rules.ts";
import { clone, createGame, exportGame, importGame, validateState } from "../model/state.ts";
import { badMoonRisingScript } from "../model/scripts.ts";
import { validatePayload } from "../commands/contracts.ts";
import { autoSecrets, dealGame, endDay, endNight, skipStep, startNight } from "./index.ts";
import { systemPorts } from "../model/ports.ts";
import { ANY_STEP_RESURRECTS_RULESET_VERSION } from "./command-versions.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import {
  RULESET_VERSION,
  applyCommand,
  canonicalState,
  checkInvariants,
  createRuntime,
  kill,
  previewCommand,
  replay,
  validateCommand,
  infoForStep,
  isImpaired,
  moonchildChoice,
} from "./index.ts";
import {
  CYCLIC_CASCADE,
  EVENT_PRIORITY,
  effectGraph,
  orderCascade,
} from "../model/effect-graph.ts";
import type { CascadeItem } from "../model/effect-graph.ts";
import { effectActive } from "./index.ts";
import type { Command, DomainEvent, Effect, GameState } from "../model/types.ts";

// The engine results are discriminated unions whose fields the assertions read
// without narrowing; these views keep the fixture's field access typed.
type EngineOutcome = {
  ok: boolean;
  status: string;
  errorCode: string;
  errors: string[];
  error: string;
  idempotent: boolean;
  events: DomainEvent[];
  changes: Record<string, unknown> | null;
  state: GameState;
  entryId: string;
  choice: { kind: string; options: Array<{ id: string }> };
  future: { activeEffects: Effect[]; delayedEffects: Effect[] };
  activePoison: Set<string>;
  activeDrunk: Set<string>;
  impaired: Set<string>;
  keys: string[];
  order: Array<{ key: string }>;
};

function outcome<T>(value: T): T & EngineOutcome {
  return value as T & EngineOutcome;
}

function make(
  assignment: Record<string, string>,
  options: { count?: number; drunkShownId?: string | null } = {},
) {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  Object.entries(assignment).forEach(([id]) => {
    state.players[id].name = "P" + id;
  });
  const roles = [...new Set(Object.values(assignment))];
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

function toDay(state: GameState) {
  const result = startNight(state);
  assert.equal(result.ok, true, JSON.stringify(result));
  while (state.night.queue.some((step) => !step.done && !step.skipped)) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped)!;
    // Fixture setup, not a host action: a permitted skip is the engine's, a
    // mandatory living step is skipped as the recorded ruleset did.
    assert.equal(skipFixtureStep(state, step.key), true, step.key);
  }
  const ended = endNight(state);
  assert.equal(ended.ok, true, JSON.stringify(ended));
  return state;
}

// A legacy port lets a fixture skip a step the current host rule refuses.
const FIXTURE_PORTS: CommandExecutionContext = {
  ...systemPorts,
  rulesetVersion: ANY_STEP_RESURRECTS_RULESET_VERSION,
};

/** Fixture setup, not a host action: skip a step as the recorded ruleset did. */
function skipFixtureStep(state: GameState, key: string): boolean {
  if (skipStep(state, key, "fixture").ok) return true;
  return skipStep(state, key, "fixture", FIXTURE_PORTS).ok;
}

function manualVotingGame() {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  toDay(state);
  kill(state, "2", "test");
  return state;
}

test("manual vote totals record zero through roster size without inventing voting actions", () => {
  const state = manualVotingGame();
  const players = clone(state.players);
  const deaths = clone(state.deaths);
  const executions = clone(state.executions);
  for (const count of [5, 0, 7]) {
    const result = applyCommand(state, {
      id: "manual-total-" + count,
      type: "setVoteCount",
      payload: { playerId: "2", count },
    });
    assert.equal(result.status, "allowed", JSON.stringify(result));
    assert.deepEqual(state.day.voteCounts, { 2: count });
    assert.deepEqual(state.players, players, "a tally never spends a token or changes a role");
    assert.deepEqual(state.day.nominations, [], "there is no invented nomination or voter list");
    assert.equal(state.day.activeNominationId, null);
    assert.equal(state.day.execution, null);
    assert.deepEqual(state.deaths, deaths);
    assert.deepEqual(state.executions, executions);
    assert.equal(state.winner, null);
  }
  const log = clone(state.log);
  const repeat = outcome(
    applyCommand(state, {
      id: "manual-total-repeat",
      type: "setVoteCount",
      payload: { playerId: "2", count: 7 },
    }),
  );
  assert.equal(repeat.status, "allowed", JSON.stringify(repeat));
  assert.deepEqual(repeat.events, []);
  assert.deepEqual(state.log, log, "repeating the same total adds no duplicate log");
});

test("manual dead-vote markers can be spent and corrected without changing other players", () => {
  const state = manualVotingGame();
  const alive = clone(state.players["1"]);
  for (const used of [false, true, false, true]) {
    const result = applyCommand(state, {
      id: "manual-token-" + state.journal.entries.length,
      type: "setDeadVoteUsed",
      payload: { playerId: "2", used },
    });
    assert.equal(result.status, "allowed", JSON.stringify(result));
    assert.equal(state.players["2"].voteToken, !used);
    assert.deepEqual(state.players["1"], alive);
    assert.deepEqual(state.day.voteCounts, {}, "token-only bookkeeping marks an incomplete ledger");
    assert.deepEqual(state.day.nominations, []);
  }
  const log = clone(state.log);
  const repeat = outcome(
    applyCommand(state, {
      id: "manual-token-repeat",
      type: "setDeadVoteUsed",
      payload: { playerId: "2", used: true },
    }),
  );
  assert.equal(repeat.status, "allowed", JSON.stringify(repeat));
  assert.deepEqual(repeat.events, []);
  assert.deepEqual(state.log, log);
});

test("manual dead-vote markers accept a Zombuul that registers as dead", () => {
  const state = createGame(7);
  state.script = badMoonRisingScript();
  state.scriptId = "bmr";
  const roles = ["exorcist", "courtier", "gambler", "gossip", "grandmother", "assassin", "zombuul"];
  state.setup.roles = roles;
  state.setup.bluffs = ["sailor", "chambermaid", "innkeeper"];
  assert.equal(
    dealGame(state, {
      assignment: Object.fromEntries(roles.map((role, i) => [String(i + 1), role])),
    }).ok,
    true,
  );
  autoSecrets(state);
  toDay(state);
  kill(state, "7", "execution");
  assert.equal(state.players["7"].alive, true);
  assert.equal(state.players["7"].registeredDead, true);
  const result = applyCommand(state, {
    id: "manual-zombuul-token",
    type: "setDeadVoteUsed",
    payload: { playerId: "7", used: true },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["7"].voteToken, false);
  assert.equal(state.players["7"].alive, true);
  assert.equal(state.winner, null);
});

test("manual voting rejects invalid values, players and unavailable days without mutation", () => {
  const state = manualVotingGame();
  const commands: Command[] = [
    ...[-1, 1.5, 8, NaN, Infinity, "2", null].map((count, index) => ({
      id: "invalid-total-" + index,
      type: "setVoteCount",
      payload: { playerId: "1", count },
    })),
    { id: "unknown-total", type: "setVoteCount", payload: { playerId: "missing", count: 2 } },
    { id: "prototype-total", type: "setVoteCount", payload: { playerId: "toString", count: 2 } },
    { id: "proto-total", type: "setVoteCount", payload: { playerId: "__proto__", count: 2 } },
    { id: "living-token", type: "setDeadVoteUsed", payload: { playerId: "1", used: true } },
    { id: "unknown-token", type: "setDeadVoteUsed", payload: { playerId: "missing", used: true } },
    {
      id: "prototype-token",
      type: "setDeadVoteUsed",
      payload: { playerId: "__proto__", used: true },
    },
    { id: "malformed-token", type: "setDeadVoteUsed", payload: { playerId: "2", used: "yes" } },
  ];
  for (const command of commands) {
    const before = JSON.stringify(state);
    assert.equal(applyCommand(state, command).status, "rejected", command.id);
    assert.equal(JSON.stringify(state), before, command.id);
  }
  for (const unavailable of ["night", "ended", "winner"] as const) {
    const blocked = clone(state);
    if (unavailable === "night") blocked.phase = "night";
    if (unavailable === "ended") blocked.day.ended = true;
    if (unavailable === "winner")
      blocked.winner = { team: "good", reason: "test", at: "2026-01-01T00:00:00.000Z" };
    for (const command of [
      { id: "blocked-total", type: "setVoteCount", payload: { playerId: "1", count: 2 } },
      { id: "blocked-token", type: "setDeadVoteUsed", payload: { playerId: "2", used: true } },
    ]) {
      const before = JSON.stringify(blocked);
      assert.equal(applyCommand(blocked, command).status, "rejected", unavailable);
      assert.equal(JSON.stringify(blocked), before, unavailable);
    }
  }
});

test("manual voting preserves preview, events, import, replay and undo", () => {
  const state = manualVotingGame();
  const events: DomainEvent[] = [];
  const snapshots: Array<Record<string, unknown>> = [];
  const commands = [
    { id: "manual-replay-total", type: "setVoteCount", payload: { playerId: "3", count: 5 } },
    { id: "manual-replay-token", type: "setDeadVoteUsed", payload: { playerId: "2", used: true } },
  ];
  for (const command of commands) {
    const pinned = { ...command, at: "2026-11-16T10:00:00.000Z" };
    snapshots.push(canonicalState(state));
    const before = JSON.stringify(state);
    const preview = outcome(previewCommand(state, pinned));
    assert.equal(preview.status, "allowed", JSON.stringify(preview));
    assert.equal(JSON.stringify(state), before, "preview is read-only");
    const applied = outcome(applyCommand(state, pinned));
    assert.equal(applied.status, "allowed", JSON.stringify(applied));
    assert.deepEqual(applied.events, preview.events);
    events.push(...applied.events);
    assert.equal(state.log.at(-1)!.at, pinned.at);
    const appliedState = JSON.stringify(state);
    assert.equal(applyCommand(state, pinned).status, "allowed");
    assert.equal(JSON.stringify(state), appliedState, "the same command ID applies once");
  }
  assert.ok(events.some((event) => event.type === "votes.count_changed"));
  assert.ok(events.some((event) => event.type === "player.vote_token_changed"));
  const imported = importGame(exportGame(state));
  assert.equal(imported.ok, true, JSON.stringify(imported));
  if (!imported.ok) return;
  assert.deepEqual(imported.state.day.voteCounts, { 3: 5 });
  assert.equal(imported.state.players["2"].voteToken, false);
  const replayed = outcome(replay(imported.state.journal));
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.deepEqual(replayed.events, events);
  assert.equal(JSON.stringify(replayed.state), JSON.stringify(state));
  const undone = outcome(
    replay({ base: state.journal.base, entries: state.journal.entries.slice(0, -1) }),
  );
  assert.equal(undone.ok, true, JSON.stringify(undone));
  assert.deepEqual(canonicalState(undone.state), snapshots.at(-1));
});

test("manual vote totals clear each day while the spent dead vote persists", () => {
  const state = manualVotingGame();
  for (const command of [
    { id: "manual-day-total", type: "setVoteCount", payload: { playerId: "3", count: 5 } },
    { id: "manual-day-token", type: "setDeadVoteUsed", payload: { playerId: "2", used: true } },
    { id: "manual-day-end", type: "endDay" },
  ]) {
    const result = applyCommand(state, command);
    assert.equal(result.status, "allowed", JSON.stringify(result));
  }
  assert.deepEqual(state.lastDay?.voteCounts, { 3: 5 });
  assert.equal(state.day.voteCounts, undefined);
  while (state.night.queue.some((step) => !step.done && !step.skipped)) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped)!;
    assert.equal(skipFixtureStep(state, step.key), true);
  }
  assert.equal(endNight(state).ok, true);
  assert.equal(state.day.voteCounts, undefined);
  assert.equal(state.players["2"].voteToken, false);
});

test("a corpse execution previews without mutation and applies once through commands", () => {
  const state = make({ 1: "chef", 2: "empath", 3: "monk", 4: "poisoner", 5: "imp" });
  toDay(state);
  const killed = applyCommand(state, {
    id: "prepare-corpse",
    type: "manualCorrection",
    payload: {
      change: { kind: "alive", playerId: "2", value: false, reason: "Prepare an execution target" },
    },
  });
  assert.equal(killed.status, "allowed", JSON.stringify(killed));
  const before = canonicalState(state);
  const command = { id: "execute-corpse", type: "executeByDecision", payload: { playerId: "2" } };
  assert.equal(validateCommand(state, command).status, "allowed");
  const preview = outcome(previewCommand(state, command));
  assert.equal(preview.status, "allowed");
  assert.ok(preview.events.some((event) => event.type === "execution.recorded"));
  assert.equal(
    preview.events.some((event) => event.type === "player.alive_changed"),
    false,
  );
  assert.deepEqual(canonicalState(state), before);
  const applied = applyCommand(state, command);
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.equal(state.day.execution?.playerId, "2");
  assert.equal(state.day.execution?.deathId, null);
  const count = state.executions.length;
  assert.equal(applyCommand(state, command).status, "allowed");
  assert.equal(state.executions.length, count);
});

test("validate rejects an unknown command without touching the state", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const before = canonicalState(state);
  const result = validateCommand(state, { id: "c1", type: "notACommand" });
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "command-unknown");
  assert.deepEqual(canonicalState(state), before);
});

test("validate reports a Storyteller choice for a Mayor redirect", () => {
  const state = make({
    1: "mayor",
    2: "chef",
    3: "empath",
    4: "monk",
    5: "soldier",
    6: "poisoner",
    7: "imp",
  });
  toDay(state);
  endDay(state);
  const imp = state.night.queue.find((step) => step.roleId === "imp");
  assert.ok(imp, "imp step exists");
  const before = canonicalState(state);
  const result = outcome(
    validateCommand(state, {
      id: "c2",
      type: "completeStep",
      payload: { key: imp.key, options: { targetIds: ["1"] } },
    }),
  );
  assert.equal(result.status, "requires-storyteller-choice");
  assert.equal(result.choice.kind, "redirect");
  assert.ok((result.choice.options as Array<{ id: string }>).some((option) => option.id === "2"));
  assert.deepEqual(canonicalState(state), before, "validate must not mutate");
});

test("preview reports consequences and delayed effects without mutating", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const poisoner = state.night.queue.find((step) => step.roleId === "poisoner")!;
  const before = canonicalState(state);
  const result = outcome(
    previewCommand(state, {
      id: "c3",
      type: "completeStep",
      payload: { key: poisoner.key, options: { targetIds: ["2"] } },
    }),
  );
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.ok(result.events.some((event) => event.type === "effect.added"));
  assert.ok(result.events.every((event) => event.commandId === "c3"));
  assert.ok(
    result.future.activeEffects.some(
      (effect) => effect.kind === "poison" && effect.targetId === "2",
    ),
  );
  assert.ok(
    result.future.delayedEffects.some((effect) => effect.kind === "poison" && effect.expires),
  );
  assert.deepEqual(canonicalState(state), before, "preview must not mutate");
});

test("apply is atomic: a rejected correction leaves no record", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  state.corrections = [];
  const before = canonicalState(state);
  const bad = applyCommand(state, {
    id: "c4",
    type: "manualCorrection",
    payload: { change: { kind: "alive", playerId: "missing", value: false, reason: "test" } },
  });
  assert.equal(bad.status, "rejected");
  assert.equal(state.corrections.length, 0, "the draft correction must be discarded");
  assert.deepEqual(canonicalState(state), before);

  const good = applyCommand(state, {
    id: "c5",
    type: "manualCorrection",
    payload: { change: { kind: "alive", playerId: "1", value: false, reason: "test" } },
  });
  assert.equal(good.status, "allowed", JSON.stringify(good));
  assert.equal(state.corrections.length, 1);
  assert.equal(state.players["1"].alive, false);
});

test("apply is idempotent by command id and rejects id conflicts (SYS-STATE-02)", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  toDay(state);
  const deaths = state.deaths.length;
  const first = applyCommand(state, {
    id: "kill-imp",
    type: "executeByDecision",
    payload: { playerId: "7" },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.deaths.length, deaths + 1);
  const afterFirst = canonicalState(state);

  const second = applyCommand(state, {
    id: "kill-imp",
    type: "executeByDecision",
    payload: { playerId: "7" },
  });
  assert.equal(second.status, "allowed");
  assert.equal(second.idempotent, true);
  assert.deepEqual(canonicalState(state), afterFirst, "a repeated command must not apply twice");

  const conflict = applyCommand(state, { id: "kill-imp", type: "endDay" });
  assert.equal(conflict.status, "rejected");
  assert.equal(conflict.errorCode, "command-id-conflict");
});

test("invariants reject broken references and premature winners", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  assert.deepEqual(checkInvariants(state), []);

  const duplicateOrder = clone(state);
  duplicateOrder.order.push(duplicateOrder.order[0]);
  assert.ok(checkInvariants(duplicateOrder).length > 0);

  const brokenEffect = clone(state);
  brokenEffect.effects.push({
    id: "eff-x",
    kind: "poison",
    sourceId: "missing",
    targetId: "1",
    active: true,
  } as Effect);
  assert.ok(checkInvariants(brokenEffect).length > 0);

  const prematureWinner = clone(state);
  prematureWinner.winner = { team: "good", reason: "test" };
  assert.ok(checkInvariants(prematureWinner).some((error) => /Победитель/.test(error)));
});

test("apply records command metadata but no event log in the state", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "chef")!;
  const result = outcome(
    applyCommand(state, {
      id: "c7",
      type: "completeStep",
      payload: { key: step.key },
    }),
  );
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.ok(result.events.length > 0);
  assert.ok(result.events.every((event) => event.commandId === "c7"));
  assert.equal(state.applied["c7"].type, "completeStep");
  assert.equal(state.applied["c7"].rulesetVersion, RULESET_VERSION);
  assert.equal(typeof state.applied["c7"].identity, "string");
  assert.equal(state.applied["c7"].fingerprint, undefined);
  assert.equal(Object.hasOwn(state, "events"), false);
});

test("canonical state compares the domain model, not serialization order", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const reordered = {
    ...state,
    players: Object.fromEntries(Object.entries(state.players).reverse()),
  };
  assert.deepEqual(canonicalState(state), canonicalState(reordered));
  const changed = clone(state);
  changed.players["1"].alive = false;
  assert.notDeepEqual(canonicalState(state), canonicalState(changed));
});

test("a legacy state without an action ledger accepts a command", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  delete (state as Partial<GameState>).applied;
  const result = applyCommand(state, { id: "legacy-1", type: "startNight" });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.applied["legacy-1"].type, "startNight");
  assert.deepEqual(validateState(state), []);
  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(validateState(replayed.state), []);
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));
});

test("setup commands validate order, herring and bag patches", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const before = canonicalState(state);

  const duplicate = applyCommand(state, {
    id: "order-bad",
    type: "setOrder",
    payload: { order: [...state.order, state.order[0]] },
  });
  assert.equal(duplicate.status, "rejected");
  assert.deepEqual(canonicalState(state), before);

  const order = applyCommand(state, {
    id: "order-good",
    type: "setOrder",
    payload: { order: state.order.slice().reverse() },
  });
  assert.equal(order.status, "allowed", JSON.stringify(order));
  assert.deepEqual(state.order, ["7", "6", "5", "4", "3", "2", "1"]);

  const herring = applyCommand(state, {
    id: "herring-good",
    type: "setHerring",
    payload: { playerId: "1" },
  });
  assert.equal(herring.status, "allowed");
  assert.equal(state.setup.herringId, "1");

  const evilHerring = applyCommand(state, {
    id: "herring-bad",
    type: "setHerring",
    payload: { playerId: "6" },
  });
  assert.equal(evilHerring.status, "rejected");
  assert.equal(state.setup.herringId, "1");

  const cleared = applyCommand(state, {
    id: "herring-clear",
    type: "setHerring",
    payload: { playerId: null },
  });
  assert.equal(cleared.status, "allowed");
  assert.equal(state.setup.herringId, null);
});

test("setup information keeps the chosen role when the pair is edited", () => {
  const state = make({
    1: "librarian",
    2: "chef",
    3: "saint",
    4: "monk",
    5: "poisoner",
    6: "imp",
  });
  const chosen = applyCommand(state, {
    id: "info-role",
    type: "setSetupInfo",
    payload: {
      roleId: "librarian",
      info: { roleId: "saint", pair: ["3", "2"] },
    },
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  const stored = state.setup.info.librarian;
  assert.ok(stored && "roleId" in stored);
  assert.equal(stored.roleId, "saint", "the chosen in-play role is not replaced by the slot");
});

test("clearing the information role with an empty value drops it", () => {
  const state = make({
    1: "librarian",
    2: "chef",
    3: "saint",
    4: "monk",
    5: "poisoner",
    6: "imp",
  });
  applyCommand(state, {
    id: "info-pick",
    type: "setSetupInfo",
    payload: { roleId: "librarian", info: { roleId: "saint", pair: ["3", "2"] } },
  });
  const cleared = applyCommand(state, {
    id: "info-clear",
    type: "setSetupInfo",
    payload: { roleId: "librarian", info: { roleId: "", pair: ["", ""] } },
  });
  assert.equal(cleared.status, "allowed", JSON.stringify(cleared));
  const stored = state.setup.info.librarian;
  assert.ok(stored && "roleId" in stored);
  assert.equal(stored.roleId, "", "an explicit empty choice clears the stored role");
});

test("a night step skips without a reason through the command contract", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "mayor",
    4: "poisoner",
    5: "imp",
    6: "monk",
    7: "soldier",
  });
  startNight(state);
  // A system step has no actor, so the engine allows this skip.
  const step = state.night.queue.find((candidate) => candidate.kind === "system")!;
  assert.ok(step, "the first night has a system step");
  assert.deepEqual(validatePayload("skipStep", { key: step.key }), [], "the reason is optional");
  assert.deepEqual(validatePayload("skipStep", { key: step.key, reason: "host note" }), []);
  const skipped = applyCommand(state, {
    id: "skip-no-reason",
    type: "skipStep",
    payload: { key: step.key },
  });
  assert.equal(skipped.status, "allowed", JSON.stringify(skipped));
  const applied = state.night.queue.find((candidate) => candidate.key === step.key)!;
  assert.equal(applied.skipped, true, "the step is skipped");
  assert.equal(applied.note, "Пропущено");
});

test("bag updates normalize a draft and reject roles outside the script", () => {
  const state = createGame(8);
  const updated = applyCommand(state, {
    id: "bag-1",
    type: "bagUpdate",
    payload: {
      patch: {
        count: 7,
        resetRoster: true,
        roles: ["chef", "empath", "monk", "soldier", "mayor", "poisoner", "imp"],
      },
    },
  });
  assert.equal(updated.status, "allowed", JSON.stringify(updated));
  assert.equal(state.setup.count, 7);
  assert.equal(state.order.length, 7);
  assert.deepEqual(state.setup.roles, [
    "chef",
    "empath",
    "monk",
    "soldier",
    "mayor",
    "poisoner",
    "imp",
  ]);

  const before = canonicalState(state);
  const bad = applyCommand(state, {
    id: "bag-2",
    type: "bagUpdate",
    payload: { patch: { roles: ["pukka"] } },
  });
  assert.equal(bad.status, "rejected");
  assert.deepEqual(canonicalState(state), before);

  const draft = applyCommand(state, {
    id: "bag-3",
    type: "bagUpdate",
    payload: {
      patch: {
        script: { id: "custom-draft", name: "Custom", edition: "custom", roles: [] },
        count: 7,
        resetRoster: true,
        roles: [],
      },
    },
  });
  assert.equal(draft.status, "allowed", JSON.stringify(draft));
  assert.equal(state.script.id, "custom-draft");
  assert.deepEqual(state.setup.roles, []);
});

test("claimSeat is a command and a claimed seat cannot be claimed twice", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const first = applyCommand(state, {
    id: "claim-1",
    type: "claimSeat",
    payload: { playerId: "1", name: "Alice" },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.players["1"].claimed, true);
  assert.equal(state.players["1"].name, "Alice");

  const second = applyCommand(state, {
    id: "claim-2",
    type: "claimSeat",
    payload: { playerId: "1", name: "Bob" },
  });
  assert.equal(second.status, "rejected");
  assert.equal(state.players["1"].name, "Alice");
});

test("a repeated command id with a different payload is rejected", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner")!;
  const first = applyCommand(state, {
    id: "fp-1",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  const before = canonicalState(state);

  const conflict = outcome(
    applyCommand(state, {
      id: "fp-1",
      type: "completeStep",
      payload: { key: step.key, options: { targetIds: ["3"] } },
    }),
  );
  assert.equal(conflict.status, "rejected");
  assert.equal(conflict.errorCode, "command-id-conflict");
  assert.deepEqual(canonicalState(state), before);
});

test("unsupported ruleset versions are rejected before any mutation (SYS-SCRIPTS-09)", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const before = canonicalState(state);

  const bad = validateCommand(state, {
    id: "version-1",
    type: "startNight",
    rulesetVersion: "future-ruleset-9",
  });
  assert.equal(bad.status, "rejected");
  assert.equal(bad.errorCode, "ruleset-version-unsupported");
  assert.deepEqual(canonicalState(state), before);

  const good = validateCommand(state, {
    id: "version-2",
    type: "startNight",
    rulesetVersion: RULESET_VERSION,
  });
  assert.equal(good.status, "allowed", JSON.stringify(good));

  const implicit = validateCommand(state, { id: "version-3", type: "startNight" });
  assert.equal(implicit.status, "allowed", JSON.stringify(implicit));
});

test("preview and apply produce the same events under controlled determinism", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner")!;
  const command = {
    id: "determinism-1",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
    at: "2026-01-01T00:00:00.000Z",
  };

  const preview = outcome(previewCommand(state, command));
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.ok(preview.events.some((event) => event.type === "effect.added"));

  const target = clone(state);
  const applied = outcome(applyCommand(target, command));
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  assert.deepEqual(preview.events, applied.events);
  assert.deepEqual(preview.changes, applied.changes);
});

test("a command keeps the global random source and its own sequence deterministic", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner")!;
  const command = {
    id: "rng-source-1",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
    at: "2026-01-01T00:00:00.000Z",
  };
  const original = Math.random;
  const first = clone(state);
  const second = clone(state);
  const applied = outcome(applyCommand(first, command));
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.equal(Math.random, original, "the engine must not replace the global random source");

  const repeated = outcome(applyCommand(second, command));
  assert.equal(repeated.status, "allowed", JSON.stringify(repeated));
  assert.deepEqual(
    canonicalState(first),
    canonicalState(second),
    "the command's seeded sequence gives the same ids and effects",
  );
});

test("preview and apply agree without an explicit command timestamp", async () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner")!;
  const command = {
    id: "determinism-no-at",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
  };

  const preview = outcome(previewCommand(state, command));
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  await new Promise((resolve) => setTimeout(resolve, 5));

  const target = clone(state);
  const applied = outcome(applyCommand(target, command));
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  assert.deepEqual(preview.events, applied.events);
  assert.deepEqual(preview.changes, applied.changes);

  const previewEffect = preview.events.find((event) => event.type === "effect.added")!.payload
    .effect;
  const appliedEffect = target.effects.at(-1)!;
  assert.deepEqual(previewEffect, appliedEffect, "the domain consequence must match");
});

function poisonEffect(id: string, sourceId: string, targetId: string, night: number): Effect {
  return {
    id,
    kind: "poison",
    sourceId,
    targetId,
    start: { phase: "night", number: night },
    expires: null,
    active: true,
  };
}

function drunkEffect(
  id: string,
  sourceId: string,
  targetId: string,
  night: number,
  expiresNight: number | null = null,
): Effect {
  return {
    id,
    kind: "drunk",
    sourceId,
    targetId,
    start: { phase: "night", number: night },
    expires: expiresNight ? { phase: "night", number: expiresNight } : null,
    active: true,
  };
}

function poisonFixture() {
  return make({
    1: "poisoner",
    2: "imp",
    3: "chef",
    4: "empath",
    5: "monk",
    6: "soldier",
    7: "mayor",
  });
}

test("valid sequential mutual poison resolves in chronological order", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("poison-a-b", "1", "2", 1),
    poisonEffect("poison-b-a", "2", "1", 2),
  );
  const graph = outcome(effectGraph(state, { phase: "night", number: 2 }));
  assert.equal(graph.ok, true, JSON.stringify(graph));
  assert.equal(graph.activePoison.has("poison-a-b"), true);
  assert.equal(graph.activePoison.has("poison-b-a"), false);
  assert.equal(graph.impaired.has("2"), true);
  assert.equal(graph.impaired.has("1"), false);
});

test("same-night mutual poison is rejected as a cyclic dependency", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("cycle-a-b", "1", "2", 1),
    poisonEffect("cycle-b-a", "2", "1", 1),
  );
  const before = canonicalState(state);
  for (const run of [validateCommand, previewCommand, applyCommand]) {
    const result = run(state, { id: "cycle-" + run.name, type: "startNight" });
    assert.equal(result.status, "rejected", JSON.stringify(result));
    assert.equal(result.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
    assert.deepEqual(canonicalState(state), before, "a rejected cycle must not mutate");
  }
});

test("a three-source poison cycle is rejected (SYS-EFFECTS-04)", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("cycle-1-2", "1", "2", 1),
    poisonEffect("cycle-2-3", "2", "3", 1),
    poisonEffect("cycle-3-1", "3", "1", 1),
  );
  const result = validateCommand(state, { id: "cycle-three", type: "startNight" });
  assert.equal(result.status, "rejected", JSON.stringify(result));
  assert.equal(result.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
});

test("cyclic poison rejection does not depend on effect array order", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("order-a-b", "1", "2", 1),
    poisonEffect("order-b-a", "2", "1", 1),
  );
  const reversed = clone(state);
  reversed.effects.reverse();
  const one = outcome(validateCommand(state, { id: "cycle-order-1", type: "startNight" }));
  const two = outcome(validateCommand(reversed, { id: "cycle-order-2", type: "startNight" }));
  assert.equal(one.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
  assert.equal(two.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
  assert.deepEqual(one.errors, two.errors);
});

test("effect start and expiry bound impairing effects (SYS-EFFECTS-03)", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("future-poison", "1", "2", 2),
    drunkEffect("future-drunk", "3", "4", 2),
  );
  const before = outcome(effectGraph(state, { phase: "night", number: 1 }));
  assert.equal(before.ok, true, JSON.stringify(before));
  assert.equal(before.activePoison.has("future-poison"), false);
  assert.equal(before.activeDrunk.has("future-drunk"), false);
  assert.equal(before.impaired.has("2"), false);
  assert.equal(before.impaired.has("4"), false);

  const started = outcome(effectGraph(state, { phase: "night", number: 2 }));
  assert.equal(started.activePoison.has("future-poison"), true);
  assert.equal(started.activeDrunk.has("future-drunk"), true);
  assert.equal(started.impaired.has("2"), true);
  assert.equal(started.impaired.has("4"), true);
});

test("expired impairing effects stop impairing", () => {
  const state = poisonFixture();
  state.effects.push(
    { ...poisonEffect("exp-poison", "1", "2", 1), expires: { phase: "night", number: 2 } },
    drunkEffect("exp-drunk", "3", "4", 1, 2),
  );
  const before = outcome(effectGraph(state, { phase: "night", number: 1 }));
  assert.equal(before.activePoison.has("exp-poison"), true);
  assert.equal(before.activeDrunk.has("exp-drunk"), true);

  const at = outcome(effectGraph(state, { phase: "night", number: 2 }));
  assert.equal(at.activePoison.has("exp-poison"), false);
  assert.equal(at.activeDrunk.has("exp-drunk"), false);
  assert.equal(at.impaired.has("2"), false);
  assert.equal(at.impaired.has("4"), false);
});

test("a drunk effect suspends while its living source is impaired", () => {
  const state = poisonFixture();
  state.effects.push(drunkEffect("sailor-drunk", "1", "2", 1, 5), {
    ...poisonEffect("source-poison", "3", "1", 2),
    expires: { phase: "night", number: 4 },
  });
  const whilePoisoned = outcome(effectGraph(state, { phase: "night", number: 2 }));
  assert.equal(whilePoisoned.activeDrunk.has("sailor-drunk"), false);
  assert.equal(whilePoisoned.impaired.has("2"), false);
  assert.equal(whilePoisoned.impaired.has("1"), true);

  const afterPoison = outcome(effectGraph(state, { phase: "night", number: 4 }));
  assert.equal(afterPoison.activeDrunk.has("sailor-drunk"), true);
  assert.equal(afterPoison.impaired.has("2"), true);
});

test("a dead-source on-death drunk stays active and a plain dead-source drunk ends", () => {
  const state = poisonFixture();
  state.players["1"].alive = false;
  state.effects.push(
    { ...drunkEffect("sweetheart-drunk", "1", "2", 1), onDeath: true },
    drunkEffect("plain-dead-source-drunk", "1", "3", 1),
  );
  const graph = outcome(effectGraph(state, { phase: "night", number: 2 }));
  assert.equal(graph.activeDrunk.has("sweetheart-drunk"), true);
  assert.equal(graph.impaired.has("2"), true);
  assert.equal(graph.activeDrunk.has("plain-dead-source-drunk"), false);
  assert.equal(graph.impaired.has("3"), false);
});

test("a source impaired by poison and drunk loses its own effects", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("hit-poison", "2", "1", 1),
    drunkEffect("hit-drunk", "3", "1", 1),
    poisonEffect("source-poison", "1", "4", 1),
    drunkEffect("source-drunk", "1", "5", 1),
  );
  const graph = outcome(effectGraph(state, { phase: "night", number: 1 }));
  assert.equal(graph.impaired.has("1"), true);
  assert.equal(graph.activePoison.has("source-poison"), false);
  assert.equal(graph.activeDrunk.has("source-drunk"), false);
  assert.equal(graph.impaired.has("4"), false);
  assert.equal(graph.impaired.has("5"), false);
});

test("a mixed poison/drunk cycle is rejected", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("mix-poison", "1", "2", 1),
    drunkEffect("mix-drunk", "2", "1", 1),
  );
  const result = validateCommand(state, { id: "mix-cycle", type: "startNight" });
  assert.equal(result.status, "rejected", JSON.stringify(result));
  assert.equal(result.errorCode, "CYCLIC_EFFECT_DEPENDENCY");

  const reversed = clone(state);
  reversed.effects.reverse();
  const mirrored = validateCommand(reversed, { id: "mix-cycle-reversed", type: "startNight" });
  assert.equal(mirrored.status, "rejected", JSON.stringify(mirrored));
  assert.equal(mirrored.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
  assert.deepEqual(result.errors, mirrored.errors);
});

// A permanent effect stays active whatever happens to its source, so it waits
// for no effect on that source. Goon r2977: "The Goon still changes alignment,
// and makes the player drunk, if the player choosing the Goon was already drunk
// or poisoned." A chooser poisoned by their own ability is such a player.
test("a permanent effect on its own source resolves beside that source's own poison (SYS-EFFECTS-04, BMR-GOON-01)", () => {
  for (const reversed of [false, true]) {
    const state = poisonFixture();
    state.effects.push(poisonEffect("self-poison", "1", "1", 2), {
      ...drunkEffect("goon-drunk", "1", "1", 3, 4),
      permanent: true,
    });
    if (reversed) state.effects.reverse();
    const graph = outcome(effectGraph(state, { phase: "night", number: 3 }));
    assert.equal(graph.ok, true, JSON.stringify(graph));
    assert.equal(graph.activeDrunk.has("goon-drunk"), true, "the permanent drunk is active");
    assert.equal(
      graph.activePoison.has("self-poison"),
      false,
      "the poison of a source made drunk is suspended",
    );
    assert.equal(graph.impaired.has("1"), true);

    // At dusk the drunk ends and the source's own poison resumes.
    const dusk = outcome(effectGraph(state, { phase: "night", number: 4 }));
    assert.equal(dusk.ok, true, JSON.stringify(dusk));
    assert.equal(dusk.activeDrunk.has("goon-drunk"), false);
    assert.equal(dusk.activePoison.has("self-poison"), true);
    assert.equal(dusk.impaired.has("1"), true);
  }
});

// A permanent effect waits for nothing, so the graph may reach it before or
// after the poison on its source. It holds either way.
test("a permanent effect holds while its source is already poisoned, in either visiting order (SYS-EFFECTS-04, BMR-GOON-01)", () => {
  for (const poisonId of ["a-poison", "z-poison"]) {
    for (const reversed of [false, true]) {
      const state = poisonFixture();
      state.effects.push(poisonEffect(poisonId, "2", "1", 2), {
        ...drunkEffect("goon-drunk", "1", "1", 3, 4),
        permanent: true,
      });
      if (reversed) state.effects.reverse();
      const graph = outcome(effectGraph(state, { phase: "night", number: 3 }));
      assert.equal(graph.ok, true, JSON.stringify(graph));
      assert.equal(graph.activePoison.has(poisonId), true, poisonId);
      assert.equal(graph.activeDrunk.has("goon-drunk"), true, poisonId + " the drunk holds");
      assert.equal(graph.impaired.has("1"), true);
    }
  }
});

test("a same-night pair of a player's effects on themself is still a cycle unless one is permanent (SYS-EFFECTS-04)", () => {
  const cyclic = poisonFixture();
  cyclic.effects.push(
    poisonEffect("pair-poison", "1", "1", 2),
    drunkEffect("pair-drunk", "1", "1", 2, 3),
  );
  const rejected = validateCommand(cyclic, { id: "pair-cycle", type: "startNight" });
  assert.equal(rejected.status, "rejected", JSON.stringify(rejected));
  assert.equal(rejected.errorCode, "CYCLIC_EFFECT_DEPENDENCY");

  const resolved = poisonFixture();
  resolved.effects.push(poisonEffect("pair-poison", "1", "1", 2), {
    ...drunkEffect("pair-drunk", "1", "1", 2, 3),
    permanent: true,
  });
  const graph = outcome(effectGraph(resolved, { phase: "night", number: 2 }));
  assert.equal(graph.ok, true, JSON.stringify(graph));
  assert.equal(graph.activeDrunk.has("pair-drunk"), true);
  assert.equal(graph.activePoison.has("pair-poison"), false);
});

// The Vigormortis poison outlives its dead Minion but not that Minion's
// impairment (r3015, SNV-VIGORMORTIS-02), so it still waits for its source and
// a same-night cycle through the Minion stays unresolvable.
test("a Vigormortis poison still waits for its dead Minion, so a cycle through that Minion is rejected (SYS-EFFECTS-04, SNV-VIGORMORTIS-02)", () => {
  const vigormortis = (state: GameState, flagged: boolean) => {
    state.effects.push(
      { ...poisonEffect("minion-poison", "3", "4", 2), permanent: true, vigormortis: flagged },
      poisonEffect("neighbour-poison", "4", "3", 2),
    );
    return state;
  };
  for (const reversed of [false, true]) {
    const cyclic = vigormortis(poisonFixture(), true);
    if (reversed) cyclic.effects.reverse();
    const graph = outcome(effectGraph(cyclic, { phase: "night", number: 2 }));
    assert.equal(graph.ok, false);
    assert.equal(graph.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
    assert.deepEqual(graph.effectIds, ["minion-poison", "neighbour-poison"]);
    const rejected = validateCommand(cyclic, { id: "vigormortis-cycle", type: "startNight" });
    assert.equal(rejected.status, "rejected", JSON.stringify(rejected));
    assert.equal(rejected.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
  }

  // Another permanent poison holds whatever its source is, so it waits for
  // nothing and the pair resolves.
  const resolved = outcome(
    effectGraph(vigormortis(poisonFixture(), false), { phase: "night", number: 2 }),
  );
  assert.equal(resolved.ok, true, JSON.stringify(resolved));
  assert.equal(resolved.activePoison.has("minion-poison"), true);
  assert.equal(resolved.activePoison.has("neighbour-poison"), false);
});

test("a protected effect does not apply before its start", () => {
  const state = poisonFixture();
  state.effects.push({
    id: "future-protect",
    kind: "protected",
    sourceId: "1",
    targetId: "2",
    start: { phase: "night", number: 2 },
    expires: { phase: "night", number: 3 },
    active: true,
  });
  const effect = state.effects.at(-1)!;
  assert.equal(effectActive(state, effect, { phase: "night", number: 1 }), false);
  assert.equal(effectActive(state, effect, { phase: "night", number: 2 }), true);
});

// ---------------------------------------------------------------------------
// Shared event priority and cascade resolution (issue #29)

test("the shared event priority list is one ordered list for every script", () => {
  assert.deepEqual(Object.keys(EVENT_PRIORITY), [
    "death",
    "on-death",
    "delayed",
    "conditional-wake",
    "impairment",
    "win",
  ]);
  const values = Object.values(EVENT_PRIORITY);
  assert.deepEqual(
    values,
    [...values].sort((left, right) => left - right),
  );
  assert.equal(Object.isFrozen(EVENT_PRIORITY), true, "the list cannot be edited at runtime");
});

test("a cascade chain A to B to C resolves in one call", () => {
  const result = outcome(
    orderCascade<CascadeItem>([
      { key: "c", kind: "on-death", after: ["b"] },
      { key: "a", kind: "on-death" },
      { key: "b", kind: "on-death", after: ["a"] },
    ]),
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(
    result.order.map((item) => item.key),
    ["a", "b", "c"],
  );
});

test("the cascade order does not depend on the insertion order", () => {
  const forward: CascadeItem[] = [
    { key: "conditional-c", kind: "conditional-wake", after: ["delayed-b"] },
    { key: "death-a", kind: "death" },
    { key: "delayed-b", kind: "delayed", after: ["death-a"] },
  ];
  const reversed = [...forward].reverse().map((item) => ({ ...item }));
  const one = outcome(orderCascade(forward));
  const two = outcome(orderCascade(reversed));
  assert.equal(one.ok, true, JSON.stringify(one));
  assert.equal(two.ok, true, JSON.stringify(two));
  assert.deepEqual(
    one.order.map((item) => item.key),
    two.order.map((item) => item.key),
  );
  assert.deepEqual(
    one.order.map((item) => item.key),
    ["death-a", "delayed-b", "conditional-c"],
  );
});

test("a cyclic cascade is rejected with a typed error and leaves the input unchanged", () => {
  const items: CascadeItem[] = [
    { key: "cascade-c", kind: "impairment", after: ["cascade-b"] },
    { key: "cascade-a", kind: "impairment", after: ["cascade-c"] },
    { key: "cascade-b", kind: "impairment", after: ["cascade-a"] },
  ];
  const snapshot = JSON.stringify(items);
  const forward = outcome(orderCascade(items));
  const backward = outcome(orderCascade([...items].reverse()));
  assert.equal(forward.ok, false, JSON.stringify(forward));
  assert.equal(forward.errorCode, CYCLIC_CASCADE);
  assert.deepEqual(forward.keys, ["cascade-a", "cascade-b", "cascade-c"]);
  assert.equal(backward.ok, false);
  assert.deepEqual(backward.keys, forward.keys, "the reported cycle does not depend on order");
  assert.equal(JSON.stringify(items), snapshot, "the resolver never mutates its input");
});

test("an effect chain A to B to C resolves in one graph resolution", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("chain-a-b", "1", "2", 1),
    poisonEffect("chain-b-c", "2", "3", 1),
  );
  const graph = outcome(effectGraph(state, { phase: "night", number: 1 }));
  assert.equal(graph.ok, true, JSON.stringify(graph));
  assert.equal(graph.activePoison.has("chain-a-b"), true);
  assert.equal(graph.activePoison.has("chain-b-c"), false, "B is impaired, so its poison is off");
  assert.equal(graph.impaired.has("2"), true);
  assert.equal(graph.impaired.has("3"), false);
});

test("the same effect set resolves identically in both insertion orders", () => {
  const forward = poisonFixture();
  forward.effects.push(
    poisonEffect("order-a-b", "1", "2", 1),
    drunkEffect("order-b-c", "2", "3", 1),
  );
  const reversed = clone(forward);
  reversed.effects.reverse();
  const one = outcome(effectGraph(forward, { phase: "night", number: 1 }));
  const two = outcome(effectGraph(reversed, { phase: "night", number: 1 }));
  assert.equal(one.ok, true, JSON.stringify(one));
  assert.equal(two.ok, true, JSON.stringify(two));
  assert.deepEqual([...one.activePoison].sort(), [...two.activePoison].sort());
  assert.deepEqual([...one.activeDrunk].sort(), [...two.activeDrunk].sort());
  assert.deepEqual([...one.impaired].sort(), [...two.impaired].sort());
});

// Issue #30: the recorded journal is the history. Replaying it must rebuild the
// saved state with the same pinned clock and seeded random values.
function replayFixture() {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const snapshots: Array<Record<string, unknown>> = [];
  const events: DomainEvent[] = [];
  const run = (command: Command) => {
    snapshots.push(canonicalState(state));
    const result = outcome(applyCommand(state, command));
    assert.equal(result.status, "allowed", JSON.stringify(result));
    events.push(...(result.events || []));
  };
  run({ id: "journal-night", type: "startNight", at: "2026-02-01T20:00:00.000Z" });
  const poison = state.night.queue.find((step) => step.roleId === "poisoner");
  assert.ok(poison, "the Poisoner wakes");
  run({
    id: "journal-poison",
    type: "completeStep",
    payload: { key: poison.key, options: { targetIds: ["2"] } },
    at: "2026-02-01T20:05:00.000Z",
  });
  for (const step of state.night.queue.filter(
    (candidate) => !candidate.done && !candidate.skipped,
  )) {
    const min =
      step.bmr || step.sv
        ? step.minTargets || 0
        : step.targetMode === "none"
          ? 0
          : step.targetMode === "two"
            ? 2
            : 1;
    const pool = state.order.filter(
      (id) => state.players[id].alive && id !== step.actorId && id !== step.previousTarget,
    );
    const targetIds = pool.slice(0, min);
    const info = infoForStep(state, step, { targetIds });
    const options = Array.isArray(info.options) ? info.options : [];
    let given: Record<string, unknown> = { kind: "note", text: "fixture" };
    if (options.length) {
      const option = options[0];
      if (info.kind === "number") given = { kind: "number", value: Number(option) };
      else if (info.kind === "yes-no") given = { kind: "yes-no", value: Boolean(option) };
      else if (info.kind === "role-pair")
        given = { kind: "role-pair", pair: String(option).split("|") };
      else if (info.kind === "character" || info.kind === "one-of-two")
        given = { kind: info.kind, roleId: String(option) };
    }
    run({
      id: "journal-complete-" + step.key,
      type: "completeNightStep",
      payload: { key: step.key, targetIds, given },
      at: "2026-02-01T20:06:00.000Z",
    });
  }
  run({ id: "journal-dawn", type: "endNight", at: "2026-02-01T20:10:00.000Z" });
  run({
    id: "journal-execute",
    type: "executeByDecision",
    payload: { playerId: "7" },
    at: "2026-02-02T12:00:00.000Z",
  });
  return { state, snapshots, events };
}

test("replay rebuilds the saved state from the recorded journal (SYS-STATE-03)", () => {
  const { state, snapshots, events } = replayFixture();
  const journal = state.journal;
  assert.ok(Array.isArray(journal.entries) && journal.entries.length > 0, "a journal is recorded");
  const poisonEntry = journal.entries.find((entry) => entry.id === "journal-poison")!;
  assert.equal(
    typeof poisonEntry.fingerprint,
    "string",
    "an entry keeps its canonical fingerprint",
  );
  assert.equal(poisonEntry.at, "2026-02-01T20:05:00.000Z", "an entry pins its resolved clock");
  assert.equal(poisonEntry.rulesetVersion, RULESET_VERSION);
  assert.deepEqual(
    poisonEntry.payload!.options,
    { targetIds: ["2"] },
    "the host choice is recorded",
  );

  const replayed = outcome(replay(journal));
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.deepEqual(
    canonicalState(replayed.state),
    canonicalState(state),
    "replaying the journal reproduces the saved state",
  );
  assert.equal(
    JSON.stringify(replayed.state),
    JSON.stringify(state),
    "the replayed value serialises with the saved key order",
  );
  assert.deepEqual(replayed.events, events, "replaying the journal emits the recorded events");

  // Undo is the journal without its last entry, replayed from the same base.
  const undone = outcome(
    replay({
      base: journal.base,
      entries: journal.entries.slice(0, -1),
    }),
  );
  assert.equal(undone.ok, true, JSON.stringify(undone));
  assert.deepEqual(
    canonicalState(undone.state),
    snapshots.at(-1),
    "undo plus replay equals the state before the undone command",
  );
  assert.notDeepEqual(canonicalState(undone.state), canonicalState(state));

  // Dependency check: the recorded completions cannot replay without startNight.
  const dependent = outcome(replay({ base: journal.base, entries: journal.entries.slice(1) }));
  assert.equal(dependent.ok, false);
  assert.equal(dependent.errorCode, "journal-dependency");
  assert.ok(
    journal.entries.slice(1).some((entry) => entry.id === dependent.entryId),
    "the failing entry is named",
  );
});

test("replay is deterministic twice and never rewrites the journal it reads", () => {
  const { state } = replayFixture();
  const journal = state.journal;
  const recorded = JSON.stringify(journal);

  const first = outcome(replay(journal));
  const second = outcome(replay(journal));
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(
    JSON.stringify(first.state),
    JSON.stringify(second.state),
    "two replays of one journal serialise identically",
  );
  assert.deepEqual(first.events, second.events, "every pinned timestamp and seeded id repeats");
  assert.equal(JSON.stringify(journal), recorded, "replay must not rewrite its input journal");
  assert.equal(
    first.state.journal.entries.length,
    journal.entries.length,
    "replay appends no duplicate journal entry",
  );
});

test("a repeated command id appends no journal entry and no second effect", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const started = applyCommand(state, {
    id: "repeat-night",
    type: "startNight",
    at: "2026-02-03T20:00:00.000Z",
  });
  assert.equal(started.status, "allowed", JSON.stringify(started));
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner")!;
  const command = {
    id: "repeat-poison",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
    at: "2026-02-03T20:05:00.000Z",
  };
  const first = applyCommand(state, command);
  assert.equal(first.status, "allowed", JSON.stringify(first));
  const effects = state.effects.length;
  const entries = state.journal.entries.length;

  const second = outcome(applyCommand(state, command));
  assert.equal(second.idempotent, true);
  assert.equal(state.effects.length, effects, "a repeated step does not stack an effect");
  assert.equal(state.journal.entries.length, entries, "a repeated id appends no journal entry");
});

test("a rejected command never enters the journal", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const before = canonicalState(state);
  const result = applyCommand(state, {
    id: "rejected-journal",
    type: "completeStep",
    payload: { key: "missing-step" },
  });
  assert.equal(result.status, "rejected");
  assert.equal(state.journal.entries.length, 0, "a rejected command records nothing");
  assert.deepEqual(canonicalState(state), before);
});

test("a bag update that resizes the roster keeps the journal base and replays", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const first = applyCommand(state, {
    id: "bag-before",
    type: "setOrder",
    payload: { order: state.order.slice().reverse() },
    at: "2026-03-01T10:00:00.000Z",
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.ok(state.journal.base, "the first recorded command sets the base");
  const beforeBag = canonicalState(state);

  const bag = applyCommand(state, {
    id: "bag-count",
    type: "bagUpdate",
    payload: { patch: { count: 8 } },
    at: "2026-03-01T10:05:00.000Z",
  });
  assert.equal(bag.status, "allowed", JSON.stringify(bag));
  assert.ok(state.journal.base, "a roster resize must not drop the journal base");
  assert.equal(state.journal.entries.length, 2, "earlier entries are kept");

  const replayed = outcome(replay(state.journal));
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));

  const undone = outcome(
    replay({
      base: state.journal.base,
      entries: state.journal.entries.slice(0, -1),
    }),
  );
  assert.equal(undone.ok, true, JSON.stringify(undone));
  assert.deepEqual(
    canonicalState(undone.state),
    beforeBag,
    "undo returns to the state before the roster resize",
  );
});

test("record-only commands coalesce into one replayable journal entry", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  for (let index = 0; index < 300; index += 1) {
    const result = applyCommand(state, {
      id: "notes-" + index,
      type: "setNotes",
      payload: { notes: "x".repeat(index + 1) },
      at: "2026-03-02T10:00:00.000Z",
    });
    assert.equal(result.status, "allowed", JSON.stringify(result));
  }
  assert.equal(state.journal.entries.length, 1, "300 keystrokes stay one journal entry");
  assert.equal(state.journal.entries[0].type, "setNotes");
  assert.equal(state.journal.entries[0].payload!.notes, "x".repeat(300));
  assert.ok(state.journal.base, "the first record-only command sets the base");

  const replayed = outcome(replay(state.journal));
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.deepEqual(
    canonicalState(replayed.state),
    canonicalState(state),
    "replay reproduces the canonical game; the applied ledger is not domain state",
  );

  const start = applyCommand(state, {
    id: "notes-then-night",
    type: "startNight",
    at: "2026-03-02T20:00:00.000Z",
  });
  assert.equal(start.status, "allowed", JSON.stringify(start));
  assert.equal(state.journal.entries.length, 2, "a domain command adds its own entry");
});

test("record-only command identities keep the saved state linear", () => {
  const state = createGame(7);
  const sizes = new Map<number, number>();
  let first: Command | null = null;
  for (let index = 1; index <= 4000; index += 1) {
    const notes = "n" + index + ":" + "x".repeat(index);
    const command: Command = {
      id: "notes-" + index,
      type: "setNotes",
      payload: { notes },
      at: "2026-03-02T10:00:00.000Z",
    };
    first ||= command;
    const result = applyCommand(state, command);
    assert.equal(result.status, "allowed", JSON.stringify(result));
    if (index === 1000 || index === 2000 || index === 4000) {
      sizes.set(index, JSON.stringify(state).length);
    }
  }

  const size1000 = sizes.get(1000);
  const size2000 = sizes.get(2000);
  const size4000 = sizes.get(4000);
  assert.ok(size1000 && size2000 && size4000);
  assert.ok(
    size4000 < 2_000_000,
    "4000 note changes stay below a typical localStorage budget: " + size4000,
  );
  assert.ok(
    size4000 - size2000 < (size2000 - size1000) * 2.5,
    "the save grows roughly linearly: " + [size1000, size2000, size4000].join(" -> "),
  );
  assert.equal(
    JSON.stringify(state.applied).includes("n2000:"),
    false,
    "applied entries keep no intermediate note text",
  );
  assert.equal(
    exportGame(state).includes("n2000:"),
    false,
    "the export keeps no intermediate note text",
  );

  assert.ok(first);
  const repeated = applyCommand(state, first);
  assert.equal(repeated.status, "allowed");
  assert.equal(repeated.idempotent, true);
  assert.equal(state.notes, "n4000:" + "x".repeat(4000));
});

test("two interleaved games keep their own clock, random sequence and ids", () => {
  const build = () =>
    make({
      1: "chef",
      2: "empath",
      3: "monk",
      4: "soldier",
      5: "mayor",
      6: "poisoner",
      7: "imp",
    });
  const commandFor = (state: GameState): Command => {
    const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner")!;
    return {
      id: "interleaved-poison",
      type: "completeStep",
      payload: { key: step.key, options: { targetIds: ["2"] } },
    };
  };
  const first = build();
  const solo = build();
  const second = build();
  startNight(first);
  startNight(solo);
  startNight(second);

  const firstRuntime = createRuntime({ now: () => new Date("2030-01-01T00:00:00.000Z") });
  const secondRuntime = createRuntime({ now: () => new Date("2040-01-01T00:00:00.000Z") });

  // A preview of one game, then a full apply of another, then the first apply.
  const preview = outcome(previewCommand(first, commandFor(first), firstRuntime));
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  const other = outcome(applyCommand(second, commandFor(second), secondRuntime));
  assert.equal(other.status, "allowed", JSON.stringify(other));
  const applied = outcome(applyCommand(first, commandFor(first), firstRuntime));
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  const soloRuntime = createRuntime({ now: () => new Date("2030-01-01T00:00:00.000Z") });
  const alone = outcome(applyCommand(solo, commandFor(solo), soloRuntime));
  assert.equal(alone.status, "allowed", JSON.stringify(alone));

  assert.deepEqual(
    canonicalState(first),
    canonicalState(solo),
    "the interleaved apply matches the same game applied alone",
  );
  assert.deepEqual(preview.events, applied.events, "preview and apply still agree");
  assert.equal(
    first.log.at(-1)!.at,
    "2030-01-01T00:00:00.000Z",
    "the first game uses its own clock",
  );
  assert.equal(
    second.log.at(-1)!.at,
    "2040-01-01T00:00:00.000Z",
    "the second game uses its own clock",
  );
  assert.equal(
    first.log.at(-1)!.id,
    solo.log.at(-1)!.id,
    "the same game state and command give the same id",
  );
});

test("an imported save without a journal keeps the recorded key order", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const raw = JSON.parse(JSON.stringify(state));
  delete raw.journal;
  const imported = outcome(importGame(raw));
  assert.equal(imported.ok, true, imported.error);
  const keys = Object.keys(imported.state);
  assert.equal(
    keys.indexOf("journal"),
    keys.indexOf("applied") + 1,
    "the journal sits right after applied",
  );
  const moved = applyCommand(imported.state, {
    id: "import-order",
    type: "setOrder",
    payload: { order: imported.state.order.slice().reverse() },
  });
  assert.equal(moved.status, "allowed", JSON.stringify(moved));
  assert.equal(
    JSON.stringify(outcome(replay(imported.state.journal)).state),
    JSON.stringify(imported.state),
    "a command after the import replays with the same key order",
  );
});

test("a legacy Moonchild save ignores used.moonchildImpaired when the night state is sober (BMR-MOONCHILD-01)", () => {
  // Moonchild r1783: the choice's target dies the next night if it is good;
  // impairment is judged when the curse resolves, not when the choice was
  // made. A save written before that fix carries the old stored flag.
  const state = createGame(9);
  state.script = badMoonRisingScript();
  state.scriptId = "bmr";
  const assignment = {
    1: "moonchild",
    2: "chambermaid",
    3: "courtier",
    4: "sailor",
    5: "devilsadvocate",
    6: "po",
    7: "fool",
    8: "tinker",
    9: "minstrel",
  } as const;
  state.setup.roles = Object.values(assignment);
  state.setup.bluffs = ["innkeeper", "gossip", "grandmother"];
  for (const [id, roleId] of Object.entries(assignment)) {
    const player = state.players[id]!;
    player.roleId = roleId;
    player.shownRoleId = roleId;
    player.team = roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good";
    player.name = "P" + id;
  }
  state.players["1"].alive = false;
  state.effects.push({
    id: "legacy-moonchild-choice-poison",
    kind: "poison",
    sourceId: "2",
    targetId: "1",
    start: { phase: "day", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
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
  assert.equal(isImpaired(state, "1"), true, "the Moonchild is poisoned when they choose");
  assert.equal(moonchildChoice(state, "2").ok, true);
  state.players["1"].used.moonchildImpaired = true;
  assert.deepEqual(validateState(state), []);

  const reloaded = importGame(exportGame(state));
  assert.equal(reloaded.ok, true, reloaded.ok ? "" : reloaded.error);
  if (!reloaded.ok) return;
  assert.equal(
    reloaded.state.players["1"].used.moonchildImpaired,
    true,
    "the legacy save still carries the stored flag",
  );

  const ended = applyCommand(reloaded.state, {
    id: "legacy-moonchild-end-day",
    type: "endDay",
    payload: {},
  });
  assert.equal(ended.status, "allowed", JSON.stringify(ended));
  assert.equal(reloaded.state.night.number, 2);
  assert.equal(isImpaired(reloaded.state, "1"), false, "the poison expired at the night");
  const step = reloaded.state.night.queue.find((candidate) => candidate.roleId === "moonchild");
  assert.ok(step, "the Moonchild wakes on the next night");
  assert.deepEqual(step.targetIds, ["2"], "the public choice is kept");
  const nightCanonical = canonicalState(reloaded.state);

  const resolved = applyCommand(reloaded.state, {
    id: "legacy-moonchild-resolve",
    type: "completeStep",
    payload: { key: step.key },
  });
  assert.equal(resolved.status, "allowed", JSON.stringify(resolved));
  assert.equal(
    reloaded.state.players["2"].alive,
    false,
    "the Moonchild is sober and healthy when the curse resolves, so the good choice dies",
  );
  assert.equal(reloaded.state.journal.entries.length, 2);
  assert.deepEqual(
    reloaded.state.journal.entries.map((entry) => entry.id),
    ["legacy-moonchild-end-day", "legacy-moonchild-resolve"],
  );

  const replayed = replay(reloaded.state.journal);
  assert.equal(replayed.ok, true, replayed.ok ? "" : replayed.error);
  assert.deepEqual(canonicalState(replayed.state), canonicalState(reloaded.state));

  const undone = replay({
    base: reloaded.state.journal.base,
    entries: reloaded.state.journal.entries.slice(0, -1),
  });
  assert.equal(undone.ok, true, undone.ok ? "" : undone.error);
  assert.equal(undone.state.players["2"].alive, true, "the resolution can be replayed back");
  assert.deepEqual(canonicalState(undone.state), nightCanonical);

  const redone = replay({
    base: reloaded.state.journal.base,
    entries: reloaded.state.journal.entries,
  });
  assert.equal(redone.ok, true, redone.ok ? "" : redone.error);
  assert.equal(redone.state.players["2"].alive, false);
});
