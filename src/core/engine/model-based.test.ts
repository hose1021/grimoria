import test from "node:test";
import assert from "node:assert/strict";
import { createGame, livingPlayers, orderedPlayers, publicGameView } from "../model/state.ts";
import { presetBag } from "../model/presets.ts";
import { troubleBrewingScript } from "../model/scripts.ts";
import { executionThreshold } from "./context.ts";
import {
  autoSecrets,
  completeStep,
  currentStep,
  dealGame,
  endDay,
  endNight,
  infoForStep,
  startNight,
  targetBounds,
} from "./index.ts";
import type { GameState, NightStep } from "../model/types.ts";
import type { InfoResult } from "./information.ts";

function givenFor(info: InfoResult): Record<string, unknown> | undefined {
  if (!info.needsChoice) return undefined;
  const first = info.options?.[0];
  if (info.kind === "note") return { kind: "note", text: "verification answer" };
  if (info.kind === "number")
    return { kind: "number", value: first ?? info.value, needsChoice: false };
  if (info.kind === "yes-no") return { kind: "yes-no", value: first ?? true, needsChoice: false };
  if (info.kind === "one-of-two")
    return {
      kind: "one-of-two",
      roleId: first ?? info.roleId,
      pair: info.pair,
      needsChoice: false,
    };
  if (info.kind === "character")
    return {
      kind: "character",
      roleId: first ?? info.roleId,
      playerId: info.playerId,
      needsChoice: false,
    };
  return { kind: info.kind, roleId: first, needsChoice: false };
}

function targetsFor(game: GameState, step: NightStep): string[] {
  const bounds = targetBounds(step);
  if (bounds.max === 0) return [];
  const living = orderedPlayers(game).filter(
    (player) => player.alive && (step.targetMode !== "one-other" || player.id !== step.actorId),
  );
  const count = Math.max(bounds.min, 1);
  assert.ok(living.length >= count, `not enough legal targets for ${step.key}`);
  return living.slice(0, count).map((player) => player.id);
}

test("a legal Trouble Brewing game keeps state invariants through several full days", () => {
  const bag = presetBag("tb", 7, 0);
  assert.ok(bag);
  const game = createGame(7);
  game.script = troubleBrewingScript();
  game.scriptId = "tb";
  game.setup.count = 7;
  game.setup.roles = bag.roles.slice();
  game.setup.bluffs = bag.bluffs.slice();
  const assignment = Object.fromEntries(bag.roles.map((role, index) => [String(index + 1), role]));
  assert.equal(dealGame(game, { assignment }).ok, true);
  autoSecrets(game);
  assert.equal(startNight(game).ok, true);

  for (let turn = 0; turn < 4 && !game.winner; turn += 1) {
    for (let step = currentStep(game); step; step = currentStep(game)) {
      const targets = targetsFor(game, step);
      const info = infoForStep(game, step, { targetIds: targets });
      const given = givenFor(info);
      const result = completeStep(game, step.key, {
        targetIds: targets,
        ...(given ? { given } : {}),
      });
      assert.equal(result.ok, true, `${step.key}: ${JSON.stringify(result)}`);
    }
    if (game.winner) break;
    assert.equal(endNight(game).ok, true);
    if (game.winner) break;
    assert.equal(endDay(game).ok, true);
    assert.equal(game.phase, "night");
  }

  const living = livingPlayers(game).length;
  const dead = orderedPlayers(game).filter((player) => !player.alive).length;
  assert.equal(living + dead, game.order.length);
  assert.equal(new Set(game.order).size, game.order.length);
  assert.equal(executionThreshold(living), Math.ceil(living / 2));
  const publicText = JSON.stringify(publicGameView(game));
  for (const secret of ["roleId", "shownRoleId", "bluffs", "notes", "effects"]) {
    assert.equal(publicText.includes(secret), false, `public view leaks ${secret}`);
  }
  if (game.winner) {
    assert.ok(
      ["demon-dead", "two-alive", "saint", "mayor", "virgin", "slayer", "imp-self-kill"].includes(
        game.winner.reason,
      ),
      game.winner.reason,
    );
  }
});
