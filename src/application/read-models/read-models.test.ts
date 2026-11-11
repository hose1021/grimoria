import test from "node:test";
import assert from "node:assert/strict";
import { createGame, publicGameView } from "../../core/model/state.ts";
import { playerSnapshot, publicSnapshot } from "./index.ts";

test("the public snapshot matches the legacy projection", () => {
  const state = createGame(7);
  state.players["1"].name = "Alice";
  state.players["1"].alive = false;
  state.players["2"].registeredDead = true;
  state.day.morning = [{ playerId: "1" }];
  assert.deepEqual(publicSnapshot(state), publicGameView(state));
});

test("the public snapshot carries no secret field", () => {
  const state = createGame(7);
  state.players["1"].roleId = "imp";
  state.players["1"].notes = "secret";
  state.bluffs = ["soldier"];
  const snapshot = publicSnapshot(state);
  assert.equal("players" in snapshot, false);
  assert.equal(JSON.stringify(snapshot).includes("imp"), false);
  assert.equal(JSON.stringify(snapshot).includes("secret"), false);
});

test("the player snapshot exposes only the shown role of one seat", () => {
  const state = createGame(7);
  state.players["1"].shownRoleId = "chef";
  state.players["1"].roleId = "imp";
  const player = playerSnapshot(state, 0);
  assert.ok(player);
  assert.equal(player.shownRoleId, "chef");
  assert.equal(player.id, "1");
  assert.equal(JSON.stringify(player).includes("imp"), false);
  assert.equal(playerSnapshot(state, 99), null);
});
