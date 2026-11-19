import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../../core/model/state.ts";
import type { Effect, GameState } from "../../core/model/types.ts";
import { executionThreshold } from "../../core/engine/context.ts";
import { seatProjection, tableProjection } from "./table.ts";

function withEffect(kind: "poison" | "drunk", targetId: string): GameState {
  const game = createGame(7);
  const effect: Effect = {
    id: "verification-" + kind,
    kind,
    sourceId: "2",
    targetId,
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  };
  game.effects.push(effect);
  return game;
}

test("a poisoned seat projects poison and impairment from the engine effect graph", () => {
  const game = withEffect("poison", "1");
  const seat = seatProjection(game, "1");
  assert.equal(seat.impaired, true);
  assert.equal(seat.poisoned, true);
  assert.equal(seat.drunk, false);
});

test("a drunk-only seat projects drunk, not poison", () => {
  const game = withEffect("drunk", "3");
  const seat = seatProjection(game, "3");
  assert.equal(seat.impaired, true);
  assert.equal(seat.drunk, true);
  assert.equal(seat.poisoned, false);
});

test("the day threshold is the independent ceil(living / 2) rule for 5..15 seats", () => {
  for (let count = 5; count <= 15; count += 1) {
    const game = createGame(count);
    const projection = tableProjection(game);
    assert.equal(projection.living, count);
    assert.equal(projection.threshold, executionThreshold(count));
    assert.equal(projection.threshold, Math.ceil(count / 2));
  }
});
