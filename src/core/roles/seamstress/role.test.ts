import assert from "node:assert/strict";
import test from "node:test";
import { createGame } from "../../model/state.ts";
import { nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

test("the Seamstress declares its wake on the night-step capability for every night (SNV-SEAMSTRESS-01)", () => {
  const arm = nightArmFor(role, 1);
  assert.deepEqual(
    { kind: arm?.kind, timing: arm?.timing },
    { kind: "night-step", timing: "any" },
    "the wake is a night-step capability for both the first and later nights",
  );
  assert.equal("nightStep" in role, false, "the legacy field is gone");
  for (const night of [1, 2, 3]) {
    const step = nightStepFor(role, night);
    assert.deepEqual(
      { target: step?.target, infoKind: step?.infoKind, optional: step?.optional },
      { target: "two", infoKind: "note", optional: true },
      "the two-target step shape is unchanged on night " + night,
    );
    assert.equal(typeof step?.actor, "function", "night " + night + " keeps its actor");
  }
  assert.equal(nightResolverFor(role, 2), undefined, "the engine keeps the answer path");
});

test("the Seamstress wakes while its once-per-game ability is unspent (SNV-SEAMSTRESS-01)", () => {
  const state = createGame(5);
  state.night.number = 1;
  const player = state.players["1"];
  player.roleId = "seamstress";
  player.alive = true;
  const step = nightStepFor(role, 1);
  assert.ok(step?.actor);

  assert.equal(step.actor(state, 1, player), player, "the first night wakes the unspent holder");
  assert.equal(step.actor(state, 2, player), player, "a later night still wakes it");

  player.used = { seamstress: true };
  assert.equal(step.actor(state, 2, player), null, "a spent Seamstress never wakes again");

  player.used = {};
  player.alive = false;
  assert.equal(step.actor(state, 2, player), null, "a dead Seamstress without the retaining rule");
});
