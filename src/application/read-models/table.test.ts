import test from "node:test";
import assert from "node:assert/strict";
import {
  RULESET_VERSION,
  activeEffects,
  applyCommand,
  autoSecrets,
  butlerMaster,
  currentStep,
  dealGame,
  demonChangePending,
  executionThreshold,
  infoForStep,
  isImpaired,
  protectionFor,
  secretsErrors,
  setupErrors,
  soldierSafe,
  stepProgress,
} from "../../core/engine/index.ts";
import { createGame, livingPlayers } from "../../core/model/state.ts";
import type { CommandInput } from "../../core/commands/contracts.ts";
import type { Command, Effect, GameState, NightStep } from "../../core/model/types.ts";
import { previewOnState } from "../dispatch/preview.ts";
import {
  mayorRedirectNeeded,
  seatProjection,
  setupProjection,
  secretsProjection,
  stepProjection,
  tableProjection,
  targetBounds,
} from "./table.ts";

const ASSIGNMENT: Record<string, string> = {
  "1": "mayor",
  "2": "chef",
  "3": "empath",
  "4": "poisoner",
  "5": "imp",
};

let sequence = 0;

function scene(): GameState {
  const game = createGame(5);
  for (const player of Object.values(game.players)) {
    player.claimed = true;
    player.name = "Player " + player.seat;
  }
  game.setup.count = 5;
  game.setup.roles = [...new Set(Object.values(ASSIGNMENT))];
  game.setup.bluffs = [];
  dealGame(game, { assignment: ASSIGNMENT });
  autoSecrets(game);
  game.phase = "seat";
  return game;
}

/** Apply one command and assert the screen projection still equals the engine. */
function play(state: GameState, command: CommandInput): void {
  sequence += 1;
  const result = applyCommand(state, {
    ...command,
    id: `projection-${sequence}`,
    rulesetVersion: RULESET_VERSION,
  } as Command);
  assert.equal(result.status, "allowed", `${command.type} is allowed`);
  expectProjectionEqualsEngine(state);
}

function touching(state: GameState, step: NightStep, targetIds: string[]): Effect[] {
  const ids = [step.actorId || "", ...targetIds];
  return activeEffects(state, null).filter(
    (effect) =>
      (effect.sourceId != null && ids.includes(String(effect.sourceId))) ||
      (effect.targetId != null && ids.includes(String(effect.targetId))),
  );
}

function expectProjectionEqualsEngine(state: GameState): void {
  const projection = tableProjection(state);
  assert.equal(projection.phase, state.phase);
  assert.deepEqual(projection.step, currentStep(state));
  assert.deepEqual(projection.progress, stepProgress(state));
  assert.deepEqual(projection.pendingDemonChange, demonChangePending(state));
  assert.equal(projection.living, livingPlayers(state).length);
  assert.equal(projection.threshold, executionThreshold(livingPlayers(state).length));
  assert.deepEqual(projection.secrets, secretsErrors(state));
  assert.deepEqual(projection.winner, state.winner);
  assert.deepEqual(setupProjection(state).errors, setupErrors(state));
  assert.deepEqual(secretsProjection(state).errors, secretsErrors(state));
  // The engine's current step is the first open one in the queue.
  assert.equal(
    projection.step,
    state.night.queue.find((step) => !step.done && !step.skipped) || null,
  );
  for (const player of Object.values(state.players)) {
    const seat = seatProjection(state, player.id);
    assert.equal(seat.impaired, isImpaired(state, player.id));
    assert.equal(seat.protected, Boolean(protectionFor(state, player.id)));
    assert.equal(
      seat.safeFromAttack,
      Boolean(protectionFor(state, player.id)) || soldierSafe(state, player.id),
    );
    assert.equal(seat.butlerMasterId, butlerMaster(state, player.id));
  }
  const step = projection.step;
  if (!step) return;
  const derived = stepProjection(state, step);
  assert.deepEqual(derived.info, infoForStep(state, step));
  assert.deepEqual(derived.effects, touching(state, step, []));
  assert.equal(derived.actorImpaired, step.actorId ? isImpaired(state, step.actorId) : false);
  assert.equal(derived.needsRedirect, mayorRedirectNeeded(state, step, ""));
}

/** A table row: the commands the screen issues in one phase, asserted after each. */
interface Row {
  name: string;
  play: (state: GameState) => void;
}

function skipOpenSteps(state: GameState): void {
  for (let step = currentStep(state); step; step = currentStep(state)) {
    play(state, { type: "skipStep", payload: { key: step.key, reason: "projection test" } });
  }
}

const SCENARIO: Row[] = [
  {
    name: "start the first night",
    play: (state) => play(state, { type: "startNight", payload: {} }),
  },
  { name: "skip the first-night steps", play: skipOpenSteps },
  {
    name: "end the first night",
    play: (state) => play(state, { type: "endNight", payload: {} }),
  },
  {
    name: "execute the Chef",
    play: (state) => play(state, { type: "executeByDecision", payload: { playerId: "2" } }),
  },
  {
    name: "end the first day",
    play: (state) => play(state, { type: "endDay", payload: {} }),
  },
  {
    name: "skip to the Imp",
    play: (state) => {
      for (
        let step = currentStep(state);
        step && step.roleId !== "imp";
        step = currentStep(state)
      ) {
        play(state, { type: "skipStep", payload: { key: step.key, reason: "projection test" } });
      }
    },
  },
  {
    name: "attack the Mayor and redirect the death to nobody",
    play: (state) => {
      const step = currentStep(state);
      assert.equal(step?.roleId, "imp", "the Imp wakes on the second night");
      play(state, {
        type: "completeNightStep",
        payload: { key: step!.key, targetIds: ["1"], redirectId: "none" },
      });
    },
  },
  { name: "drain the second night", play: skipOpenSteps },
  {
    name: "end the second night",
    play: (state) => play(state, { type: "endNight", payload: {} }),
  },
];

test("the screen projection equals the engine state after every command", () => {
  const game = scene();
  expectProjectionEqualsEngine(game);
  for (const row of SCENARIO) row.play(game);
  assert.equal(tableProjection(game).living, livingPlayers(game).length);
});

test("a step projection asks for the mayor redirect only on an Imp attack", () => {
  const game = scene();
  for (const row of SCENARIO) {
    row.play(game);
    if (tableProjection(game).step?.roleId === "imp") break;
  }
  const imp = tableProjection(game).step;
  assert.equal(imp?.roleId, "imp");
  const attack = stepProjection(game, imp!, { targetIds: ["1"] });
  assert.equal(attack.needsRedirect, true);
  assert.deepEqual(attack.info, infoForStep(game, imp!, { targetIds: ["1"] }));
  assert.equal(mayorRedirectNeeded(game, imp!, "1"), true);
  const empath = game.night.queue.find((step) => step.roleId === "empath");
  assert.ok(empath, "the Empath step exists in the second-night queue");
  assert.equal(stepProjection(game, empath, { targetIds: ["1"] }).needsRedirect, false);
});

test("a seat projection reports its impairment, protection and butler master", () => {
  const game = scene();
  const seat = seatProjection(game, "1");
  assert.equal(seat.impaired, false);
  assert.equal(seat.protected, false);
  assert.equal(seat.safeFromAttack, false);
  assert.equal(seat.butlerMasterId, null);
});

test("the dispatch preview issues a fresh id without touching the state", () => {
  const game = scene();
  const before = JSON.stringify(game);
  const first = previewOnState(game, { type: "startNight", payload: {} });
  const second = previewOnState(game, { type: "startNight", payload: {} });
  assert.equal(first.status, "allowed");
  assert.equal(second.status, "allowed");
  const firstId = first.status === "allowed" ? first.id : "";
  const secondId = second.status === "allowed" ? second.id : "";
  assert.notEqual(firstId, secondId);
  assert.equal(JSON.stringify(game), before, "the preview must not mutate the state");
});

test("target bounds follow the step's fixed target mode", () => {
  const step: NightStep = { key: "n1-x", kind: "system", system: "dusk", targetMode: "none" };
  assert.deepEqual(targetBounds(step), { min: 0, max: 0 });
  assert.deepEqual(targetBounds({ ...step, targetMode: "one" }), { min: 1, max: 1 });
  assert.deepEqual(targetBounds({ ...step, targetMode: "two" }), { min: 2, max: 2 });
  assert.deepEqual(targetBounds({ ...step, bmr: true, minTargets: 1, maxTargets: 3 }), {
    min: 1,
    max: 3,
  });
});
