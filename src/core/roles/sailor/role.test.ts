import test from "node:test";
import assert from "node:assert/strict";
import type { AbilityContext, AbilityDecision } from "../ability.ts";
import { nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

function context(overrides: Partial<AbilityContext> = {}): AbilityContext {
  return {
    actorId: "1",
    targetIds: ["4"],
    chosenRoleId: null,
    drunkId: "4",
    impaired: false,
    at: { phase: "night", number: 2 },
    pendings: [],
    actualRoleOf: () => null,
    hasPlayer: () => true,
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

test("the Sailor module declares one step for every night, and the choice replaces the last (BMR-SAILOR-01)", () => {
  for (const night of [1, 2, 5]) {
    assert.deepEqual(nightStepFor(role, night), { target: "one-any", noteKey: "note.bmr.sailor" });
    assert.deepEqual(nightArmFor(role, night)?.endsOnUse, ["drunk"]);
  }
});

test("a healthy Sailor makes the host's choice drunk until dusk (BMR-SAILOR-01, BMR-SAILOR-02)", () => {
  assert.deepEqual(resolve(), {
    kind: "effects",
    effects: [
      {
        kind: "timed-effect",
        effect: "drunk",
        playerId: "4",
        expires: { phase: "night", number: 3 },
      },
    ],
  });
  const self = resolve({ at: { phase: "night", number: 1 }, drunkId: "1" });
  assert.deepEqual(self, {
    kind: "effects",
    effects: [
      {
        kind: "timed-effect",
        effect: "drunk",
        playerId: "1",
        expires: { phase: "night", number: 2 },
      },
    ],
  });
});

test("an impaired Sailor makes nobody drunk (BMR-SAILOR-01)", () => {
  assert.deepEqual(resolve({ impaired: true }), { kind: "suppressed" });
  assert.deepEqual(resolve({ impaired: true, drunkId: null }), { kind: "suppressed" });
});

test("a Sailor step without the host's drunk choice makes nobody drunk", () => {
  assert.deepEqual(resolve({ drunkId: null }), { kind: "no-effect" });
});
