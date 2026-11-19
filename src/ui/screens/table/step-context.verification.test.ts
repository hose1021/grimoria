import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../../../core/model/state.ts";
import { troubleBrewingScript } from "../../../core/model/scripts.ts";
import { dealGame, startNight } from "../../../core/engine/index.ts";
import type { Effect, GameState, NightStep } from "../../../core/model/types.ts";
import { stepContext } from "./step-context.ts";
import type { StepDraftSource } from "./step-context.ts";

function drafts(): StepDraftSource {
  return {
    registrations: new Map(),
    targets: new Map(),
    redirects: new Map(),
    givens: new Map(),
    bmrDeaths: new Map(),
    bmrResurrect: new Map(),
    bmrRoles: new Map(),
    bmrDrunk: new Map(),
    bmrPoison: new Map(),
  };
}

function gameWithChef(poisonChef: boolean): GameState {
  const game = createGame(5);
  game.script = troubleBrewingScript();
  game.scriptId = "tb";
  game.setup.count = 5;
  game.setup.roles = ["chef", "empath", "soldier", "poisoner", "imp"];
  game.setup.bluffs = [];
  assert.equal(
    dealGame(game, {
      assignment: { 1: "chef", 2: "empath", 3: "soldier", 4: "poisoner", 5: "imp" },
    }).ok,
    true,
  );
  if (poisonChef) {
    const effect: Effect = {
      id: "gate-poison",
      kind: "poison",
      sourceId: "4",
      targetId: "1",
      start: { phase: "night", number: 1 },
      expires: null,
      active: true,
    };
    game.effects.push(effect);
  }
  assert.equal(startNight(game).ok, true);
  return game;
}

function chefStep(game: GameState): NightStep {
  const step = game.night.queue.find((entry) => entry.roleId === "chef");
  assert.ok(step);
  return step;
}

test("an impaired information step is blocked until a given answer exists", () => {
  const game = gameWithChef(true);
  const context = stepContext(game, drafts(), chefStep(game));
  assert.equal(context.info.needsChoice, true);
  assert.equal(context.blockers.includes("given"), true);
});

test("a healthy information step has no given blocker", () => {
  const game = gameWithChef(false);
  const context = stepContext(game, drafts(), chefStep(game));
  assert.equal(context.info.needsChoice, false);
  assert.equal(context.blockers.includes("given"), false);
});
