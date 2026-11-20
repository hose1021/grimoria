import assert from "node:assert/strict";
import test from "node:test";
import { createGame } from "../../model/state.ts";
import { nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

test("the Juggler declares its wake on the night-step capability for other nights (SNV-JUGGLER-01)", () => {
  assert.equal(nightStepFor(role, 1), undefined, "the Juggler does not wake on night 1");
  assert.equal(nightResolverFor(role, 2), undefined, "the engine keeps the answer path");
  for (const night of [2, 3]) {
    const step = nightStepFor(role, night);
    assert.deepEqual(
      { target: step?.target, infoKind: step?.infoKind },
      { target: "none", infoKind: "number" },
    );
    assert.equal(typeof step?.actor, "function");
  }
});

test("the Juggler wakes only on the night after its guessing day (SNV-JUGGLER-01)", () => {
  const state = createGame(5);
  state.night.number = 2;
  const player = state.players["1"];
  player.roleId = "juggler";
  player.alive = true;
  state.juggler = { day: 1, guesses: {}, holderId: "1" };
  const step = nightStepFor(role, 2);
  assert.ok(step?.actor);

  assert.equal(step.actor(state, 2, player), player, "the night after the guessing day");
  state.juggler.day = 2;
  assert.equal(step.actor(state, 2, player), null, "not on the guessing day itself");

  state.juggler.day = 1;
  player.used = { juggler: true };
  assert.equal(step.actor(state, 2, player), null, "a spent Juggler never wakes again");
});
