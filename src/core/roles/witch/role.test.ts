import assert from "node:assert/strict";
import test from "node:test";
import { createGame } from "../../model/state.ts";
import { nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

test("the Witch declares its wake on the night-step capability for every night (SNV-WITCH-01)", () => {
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
      { target: "one-any", infoKind: "note", optional: undefined },
      "the one-any step shape is unchanged on night " + night,
    );
    assert.equal(typeof step?.actor, "function", "night " + night + " keeps its actor");
  }
  assert.equal(nightResolverFor(role, 2), undefined, "the engine keeps the curse path");
});

test("the Witch wakes only while more than three players live (SNV-WITCH-01)", () => {
  const state = createGame(5);
  state.night.number = 1;
  const player = state.players["1"];
  player.roleId = "witch";
  player.alive = true;
  const step = nightStepFor(role, 1);
  assert.ok(step?.actor);

  assert.equal(step.actor(state, 1, player), player, "five living players keep the ability");
  state.players["2"].alive = false;
  state.players["3"].alive = false;
  assert.equal(step.actor(state, 2, player), null, "exactly three living players lose it");
  state.players["4"].alive = false;
  assert.equal(step.actor(state, 2, player), null, "two living players never restore it");

  player.alive = false;
  assert.equal(step.actor(state, 2, player), null, "a dead Witch without the retaining rule");
});
