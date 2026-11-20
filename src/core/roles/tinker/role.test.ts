import test from "node:test";
import assert from "node:assert/strict";
import type { AbilityContext, AbilityDecision } from "../ability.ts";
import { nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

function context(overrides: Partial<AbilityContext> = {}): AbilityContext {
  return {
    actorId: "1",
    targetIds: [],
    chosenRoleId: null,
    drunkId: null,
    impaired: false,
    at: { phase: "night", number: 2 },
    pendings: [],
    actualRoleOf: (id) => (id === "1" ? "tinker" : null),
    hasPlayer: (id) => id === "1",
    nameOf: (id) => "P" + id,
    ...overrides,
  };
}

function resolve(overrides: Partial<AbilityContext> = {}): AbilityDecision {
  const facts = context(overrides);
  const resolver = nightResolverFor(role, facts.at.number);
  assert.ok(resolver, "the module owns the resolution");
  return resolver(facts);
}

test("the Tinker module declares a step on every night and ends nothing on use (BMR-TINKER-01)", () => {
  for (const night of [1, 2, 5]) {
    assert.deepEqual(nightStepFor(role, night), {
      target: "none",
      canKill: true,
      noteKey: "note.bmr.tinker",
    });
    assert.ok(nightResolverFor(role, night), "the module owns the resolution");
    assert.equal(nightArmFor(role, night)?.endsOnUse, undefined);
  }
});

test("the Tinker's step resolves to nothing, healthy or impaired: the host marks the death (BMR-TINKER-01)", () => {
  assert.deepEqual(resolve(), { kind: "no-effect" });
  assert.deepEqual(resolve({ impaired: true }), { kind: "no-effect" });
});
