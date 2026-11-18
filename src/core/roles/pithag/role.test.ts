import test from "node:test";
import assert from "node:assert/strict";
import type { TransformationContext, TransformationDecision } from "../ability.ts";
import { nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

function changeOf(overrides: Partial<TransformationContext> = {}): TransformationDecision {
  const capability = role.capabilities.find((candidate) => candidate.kind === "transformation");
  assert.ok(capability && capability.kind === "transformation");
  return capability.resolve({
    actorId: "7",
    targetId: "6",
    newRoleId: "sage",
    cause: "pithag",
    impaired: false,
    at: { phase: "night", number: 2 },
    roleInPlay: (roleId) => roleId === "oracle",
    nameOf: (id) => "P" + id,
    actualRoleOf: () => null,
    hasPlayer: () => true,
    ...overrides,
  });
}

test("the Pit-Hag module declares its step from the second night, without a death control, and owns no night-step resolution (SNV-PITHAG-01)", () => {
  assert.equal(nightStepFor(role, 1), undefined);
  for (const night of [2, 5]) {
    assert.deepEqual(nightStepFor(role, night), {
      target: "one-any",
      infoKind: "note",
    });
    assert.equal(nightArmFor(role, night)?.timing, "other");
    assert.equal(nightResolverFor(role, night), undefined);
  }
});

test("a healthy Pit-Hag replaces the player's character when it is not in play, and nothing happens otherwise (SNV-PITHAG-01)", () => {
  assert.deepEqual(changeOf(), { kind: "replace", playerId: "6", roleId: "sage" });
  assert.deepEqual(changeOf({ newRoleId: "oracle" }), { kind: "no-effect", reason: "in-play" });
  assert.deepEqual(changeOf({ impaired: true }), { kind: "no-effect", reason: "impaired" });
});
