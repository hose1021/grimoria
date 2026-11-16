import test from "node:test";
import assert from "node:assert/strict";

import { COMMAND_TYPES } from "../commands/contracts.ts";
import type { Phase } from "../commands/contracts.ts";
import { createGame } from "../model/state.ts";
import type { GameState } from "../model/types.ts";
import { presetBag } from "../model/presets.ts";
import { badMoonRisingScript, sectsAndVioletsScript } from "../model/scripts.ts";

import {
  applyCommand,
  autoSecrets,
  canonicalState,
  dealGame,
  endDay,
  endNight,
  previewCommand,
  setWinner,
  skipStep,
  startNight,
  validateCommand,
} from "./index.ts";
import { COMMAND_PHASES, lifecycleGuard } from "./lifecycle.ts";

const PHASES: Phase[] = ["setup", "deal", "seat", "night", "day", "over"];

function dealtTroubleBrewing(count = 5): GameState {
  const state = createGame(count);
  const bag = presetBag("tb", count, 0);
  assert.ok(bag, "a Trouble Brewing preset exists at " + count);
  state.setup.roles = bag.roles.slice();
  state.setup.bluffs = bag.bluffs.slice();
  state.setup.drunkShownId = bag.drunkShownId;
  state.setup.lunaticShownId = bag.lunaticShownId;
  state.setup.godfatherOutsider = bag.godfatherOutsider;
  const assignment: Record<string, string> = {};
  state.order.forEach((id, index) => {
    assignment[id] = bag.roles[index]!;
  });
  const dealt = dealGame(state, { assignment });
  assert.equal(dealt.ok, true, JSON.stringify(dealt));
  autoSecrets(state);
  return state;
}

function toNight(state: GameState): GameState {
  const started = startNight(state);
  assert.equal(started.ok, true, JSON.stringify(started));
  return state;
}

function toDay(state: GameState): GameState {
  for (;;) {
    const pending = state.night.queue.find((step) => !step.done && !step.skipped);
    if (!pending) break;
    const skipped = skipStep(state, pending.key, "lifecycle test");
    assert.equal(skipped.ok, true, JSON.stringify(skipped));
  }
  const ended = endNight(state);
  assert.equal(ended.ok, true, JSON.stringify(ended));
  return state;
}

function mixedManualState(): GameState {
  const state = createGame(5);
  state.script = {
    id: "custom-mixed-guard",
    name: "Mixed manual guard",
    edition: "custom",
    source: "manual",
    author: "",
    roles: ["fortuneteller", "chambermaid", "monk", "poisoner", "imp"],
    manualOnly: true,
  };
  state.scriptId = state.script.id;
  state.setup.roles = ["fortuneteller", "chambermaid", "monk", "poisoner", "imp"];
  state.setup.bluffs = [];
  const assignment = {
    1: "fortuneteller",
    2: "chambermaid",
    3: "monk",
    4: "poisoner",
    5: "imp",
  };
  const dealt = dealGame(state, { assignment });
  assert.equal(dealt.ok, true, JSON.stringify(dealt));
  assert.equal(startNight(state).ok, true);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");
  return state;
}

test("every command type declares a lifecycle phase policy (SYS-LIFECYCLE-02)", () => {
  for (const type of COMMAND_TYPES) {
    const policy = COMMAND_PHASES[type];
    assert.ok(policy, "missing policy for " + type);
    if (policy.phases === "any") continue;
    for (const phase of policy.phases) {
      assert.ok(PHASES.includes(phase), type + " declares an unknown phase " + phase);
    }
  }
});

test("the lifecycle guard rejects each command outside its declared phases (SYS-LIFECYCLE-02)", () => {
  const state = createGame(5);
  for (const type of COMMAND_TYPES) {
    const policy = COMMAND_PHASES[type];
    state.winner = null;
    if (policy.phases === "any") {
      for (const phase of PHASES) {
        state.phase = phase;
        assert.equal(lifecycleGuard(state, type), null, type + " must run in " + phase);
      }
      continue;
    }
    const wrong = PHASES.find((phase) => !policy.phases.includes(phase));
    assert.ok(wrong, type + " must leave at least one phase out");
    state.phase = wrong;
    const rejection = lifecycleGuard(state, type);
    assert.equal(rejection?.ok, false, type + " must reject " + wrong);
    assert.equal(rejection?.errorCode, policy.reject.errorCode, type + " rejection code");
  }
});

test("the lifecycle guard reports a finished game before the phase (SYS-LIFECYCLE-02)", () => {
  const state = createGame(5);
  state.phase = "day";
  state.winner = {
    team: "good",
    reason: "manual",
    title: "Победа добра",
    detail: "",
    at: "2026-01-01T00:00:00.000Z",
  };
  assert.equal(lifecycleGuard(state, "endDay")?.errorCode, "error.6");
  assert.equal(lifecycleGuard(state, "setNotes"), null, "notes stay allowed in over");
});

test("a full play cycle follows the declared transitions (SYS-LIFECYCLE-01)", () => {
  const state = dealtTroubleBrewing();
  assert.equal(state.phase, "deal");
  toNight(state);
  assert.equal(state.phase, "night");
  toDay(state);
  assert.equal(state.phase, "day");
  const next = endDay(state);
  assert.equal(next.ok, true, JSON.stringify(next));
  assert.equal(state.phase, "night");
  setWinner(state, "good", "manual");
  assert.equal(state.phase, "over");
});

test("ending the night in the day is rejected and keeps the day intact (SYS-LIFECYCLE-01)", () => {
  const state = dealtTroubleBrewing();
  toNight(state);
  toDay(state);
  const before = canonicalState(state);
  const command = { id: "end-night-in-day", type: "endNight" as const, payload: {} };

  const validated = validateCommand(state, command);
  assert.equal(validated.status, "rejected");
  assert.equal(validated.errorCode, "error.78");
  assert.deepEqual(canonicalState(state), before, "validate must not mutate");

  const previewed = previewCommand(state, command);
  assert.equal(previewed.status, "rejected");
  assert.deepEqual(canonicalState(state), before, "preview must not mutate");

  const applied = applyCommand(state, command);
  assert.equal(applied.status, "rejected");
  assert.equal(applied.errorCode, "error.78");
  assert.deepEqual(canonicalState(state), before, "apply must not mutate");
});

test("dealing during the night is rejected and keeps the running game (SYS-LIFECYCLE-02)", () => {
  const state = dealtTroubleBrewing();
  toNight(state);
  const before = canonicalState(state);
  const result = applyCommand(state, {
    id: "deal-in-night",
    type: "dealGame",
    payload: { options: {} },
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "error.47");
  assert.deepEqual(canonicalState(state), before);
});

test("a setup secret correction stays available during the night (SYS-LIFECYCLE-02)", () => {
  const state = dealtTroubleBrewing();
  toNight(state);
  const result = applyCommand(state, {
    id: "herring-in-night",
    type: "setHerring",
    payload: { playerId: "2" },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.setup.herringId, "2");
  assert.equal(state.phase, "night");
});

test("a seat order correction stays available during the night (SYS-LIFECYCLE-02)", () => {
  const state = dealtTroubleBrewing();
  toNight(state);
  const order = state.order.slice().reverse();
  const result = applyCommand(state, {
    id: "seat-order-in-night",
    type: "setOrder",
    payload: { order },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.deepEqual(state.order, order);
  assert.equal(state.phase, "night");
});

test("a play command after over is rejected and keeps the winner (SYS-LIFECYCLE-01)", () => {
  const state = dealtTroubleBrewing();
  toNight(state);
  setWinner(state, "evil", "manual");
  const before = canonicalState(state);
  const result = applyCommand(state, {
    id: "open-after-over",
    type: "openNominations",
    payload: {},
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "error.6");
  assert.deepEqual(canonicalState(state), before);
});

test("a bag reset cannot move the game out of setup (SYS-LIFECYCLE-02)", () => {
  const state = createGame(5);
  const before = canonicalState(state);
  const result = applyCommand(state, {
    id: "bag-phase-day",
    type: "bagUpdate",
    payload: { patch: { resetRoster: true, count: 5, phase: "day" } },
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "error.47");
  assert.deepEqual(canonicalState(state), before);
});

test("a bag roster reset during the night returns to setup (SYS-LIFECYCLE-02)", () => {
  const state = dealtTroubleBrewing();
  toNight(state);
  assert.equal(state.phase, "night");
  const result = applyCommand(state, {
    id: "bag-reset-night",
    type: "bagUpdate",
    payload: { patch: { count: 5 } },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.phase, "setup");
  assert.deepEqual(state.setup.roles, []);
  assert.deepEqual(state.night.queue, []);
});

test("a bag edit without a roster reset is rejected during the night (SYS-LIFECYCLE-02)", () => {
  const state = dealtTroubleBrewing();
  toNight(state);
  const before = canonicalState(state);
  const result = applyCommand(state, {
    id: "bag-edit-night",
    type: "bagUpdate",
    payload: { patch: { roles: state.setup.roles.slice() } },
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "error.47");
  assert.deepEqual(canonicalState(state), before);
});

test("every supported edition shares the day and night guard (SYS-LIFECYCLE-01)", () => {
  const state = createGame(5);
  for (const script of [badMoonRisingScript(), sectsAndVioletsScript(), createGame(5).script]) {
    state.script = script;
    state.scriptId = script.id;
    state.winner = null;
    state.phase = "day";
    assert.equal(lifecycleGuard(state, "endDay"), null, script.id + " may end a day");
    state.phase = "night";
    assert.equal(lifecycleGuard(state, "endDay")?.errorCode, "error.7", script.id + " night");
  }
});

test("a manual-only pool keeps the same phase guards (SYS-LIFECYCLE-01)", () => {
  const state = mixedManualState();
  assert.equal(state.script?.manualOnly, true);
  const before = canonicalState(state);
  const result = applyCommand(state, {
    id: "manual-end-night-in-day",
    type: "endNight",
    payload: {},
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "error.78");
  assert.deepEqual(canonicalState(state), before);
});
