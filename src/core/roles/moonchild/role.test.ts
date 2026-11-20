import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../../model/state.ts";
import type { GameState } from "../../model/types.ts";
import { role } from "./role.ts";

function game(): GameState {
  const state = createGame(7);
  state.players["1"].roleId = "philosopher";
  state.players["2"].roleId = "clockmaker";
  state.players["3"].roleId = "dreamer";
  return state;
}

function actorOf(state: GameState) {
  const actor = role.nightStep.actor;
  assert.ok(actor, "the Moonchild declares an actor");
  return actor(state);
}

test("a dead borrowed Moonchild resolves the choice under the Philosopher's name (SNV-PHILOSOPHER-02)", () => {
  const state = game();
  state.players["1"].alive = false;
  state.players["1"].used = { philosopherAbility: "moonchild", moonchildTarget: "3" };
  assert.equal(actorOf(state)?.id, "1");
});

test("a Drunk shown the Moonchild has no Moonchild step (Drunk r3165)", () => {
  const state = game();
  state.players["1"].roleId = "drunk";
  state.players["1"].shownRoleId = "moonchild";
  state.players["1"].alive = false;
  state.players["1"].used = { moonchildTarget: "3" };
  assert.equal(actorOf(state), null);
});

test("a living Moonchild does not wake, and a resolved one does not wake again (BMR-MOONCHILD-01)", () => {
  const state = game();
  state.players["1"].roleId = "moonchild";
  state.players["1"].used = { moonchildTarget: "3" };
  assert.equal(actorOf(state), null, "the choice resolves only after the death");
  state.players["1"].alive = false;
  assert.equal(actorOf(state)?.id, "1");
  state.players["1"].used!.moonchildResolved = true;
  assert.equal(actorOf(state), null, "a second death never resolves again");
});
