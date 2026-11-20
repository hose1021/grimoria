import assert from "node:assert/strict";
import test from "node:test";
import { createGame } from "../../model/state.ts";
import { deathStepOf, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

test("the Klutz declares its death step on the death-step capability (SNV-KLUTZ-01)", () => {
  assert.equal(nightStepFor(role, 1), undefined, "the Klutz does not wake on a night");
  const step = deathStepOf(role);
  assert.ok(step);
  assert.deepEqual(
    { target: step.target, infoKind: step.infoKind },
    {
      target: "one-any",
      infoKind: "note",
    },
  );
  assert.equal(typeof step.actor, "function");
});

test("the Klutz death step offers no living candidate (SNV-KLUTZ-01)", () => {
  const state = createGame(5);
  const player = state.players["1"];
  player.roleId = "klutz";
  player.alive = true;
  const step = deathStepOf(role);
  assert.ok(step?.actor);
  assert.equal(step.actor(state, 1, player), null, "a living Klutz has no death choice");
});
