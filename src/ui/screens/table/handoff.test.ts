import assert from "node:assert/strict";
import test from "node:test";
import { createGame } from "../../../core/model/state.ts";
import { correctionContext, privateContext } from "./handoff.ts";

function fixture() {
  const game = createGame(5);
  game.phase = "night";
  Object.assign(game.players["1"], { roleId: "chef", shownRoleId: "chef" });
  game.night.queue = [{ key: "wake", kind: "role", roleId: "chef", actorId: "1" }];
  return game;
}

test("a shown role stays open through notes and loses its context when its assignment changes or disappears", () => {
  const game = fixture();
  const role = () => privateContext(game, "player", "1");
  const original = role();
  assert.ok(original);
  game.notes = "private notes";
  assert.equal(role(), original);
  game.players["1"].shownRoleId = "imp";
  assert.notEqual(role(), original);
  delete game.players["1"];
  assert.equal(role(), null);
});

test("both night handoffs lose their context when the wake or the game changes", () => {
  for (const kind of ["info", "grimoire"] as const) {
    const game = fixture();
    if (kind === "grimoire") game.night.queue[0].roleId = "spy";
    const current = () => privateContext(game, kind, "wake");
    const original = current();
    assert.ok(original);
    game.notes = "host notes";
    assert.equal(current(), original);
    game.createdAt = "another game";
    assert.notEqual(current(), original);
    game.night.queue[0].done = true;
    assert.equal(current(), null);
  }
});

test("a correction draft follows its original game and deal even when seat IDs repeat", () => {
  const game = fixture();
  const original = correctionContext(game);
  game.notes = "extra detail";
  assert.equal(correctionContext(game), original);
  const replacement = structuredClone(game);
  replacement.createdAt = "another game";
  assert.notEqual(correctionContext(replacement), original);
  game.players["1"].roleId = "washerwoman";
  assert.notEqual(correctionContext(game), original);
});

test("a winner invalidates an open handoff before the host victory panel can appear", () => {
  const game = fixture();
  const original = privateContext(game, "player", "1");
  game.winner = { team: "good", reason: "test" };
  assert.notEqual(privateContext(game, "player", "1"), original);
  assert.equal(privateContext(game, "info", "wake"), null);
});
