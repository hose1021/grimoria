import test from "node:test";
import assert from "node:assert/strict";
import type { AbilityContext, AbilityDecision } from "../ability.ts";
import { nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

function context(overrides: Partial<AbilityContext> = {}): AbilityContext {
  return {
    actorId: "2",
    targetIds: ["4", "5"],
    chosenRoleId: null,
    drunkId: "5",
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

test("the Innkeeper module declares a step for every night except the first (BMR-INNKEEPER-01)", () => {
  assert.equal(nightStepFor(role, 1), undefined);
  assert.equal(nightResolverFor(role, 1), undefined);
  for (const night of [2, 5]) {
    assert.deepEqual(nightStepFor(role, night), { target: "two", noteKey: "note.bmr.innkeeper" });
    assert.deepEqual(nightArmFor(role, night)?.endsOnUse, ["safe", "drunk"]);
  }
});

test("a healthy Innkeeper makes both players safe tonight and one drunk until dusk (BMR-INNKEEPER-01)", () => {
  assert.deepEqual(resolve(), {
    kind: "effects",
    effects: [
      { kind: "timed-effect", effect: "safe", playerId: "4", expires: { phase: "day", number: 2 } },
      { kind: "timed-effect", effect: "safe", playerId: "5", expires: { phase: "day", number: 2 } },
      {
        kind: "timed-effect",
        effect: "drunk",
        playerId: "5",
        expires: { phase: "night", number: 3 },
      },
    ],
  });
  const self = resolve({ at: { phase: "night", number: 4 }, targetIds: ["2", "6"], drunkId: "2" });
  assert.deepEqual(self, {
    kind: "effects",
    effects: [
      { kind: "timed-effect", effect: "safe", playerId: "2", expires: { phase: "day", number: 4 } },
      { kind: "timed-effect", effect: "safe", playerId: "6", expires: { phase: "day", number: 4 } },
      {
        kind: "timed-effect",
        effect: "drunk",
        playerId: "2",
        expires: { phase: "night", number: 5 },
      },
    ],
  });
});

test("an impaired Innkeeper protects nobody and makes nobody drunk (BMR-INNKEEPER-01)", () => {
  assert.deepEqual(resolve({ impaired: true }), { kind: "suppressed" });
  assert.deepEqual(resolve({ impaired: true, drunkId: null }), { kind: "suppressed" });
});

test("an Innkeeper step without two players or without the drunk choice", () => {
  assert.deepEqual(resolve({ targetIds: ["4"] }), { kind: "no-effect" });
  assert.deepEqual(resolve({ targetIds: [], impaired: true }), { kind: "no-effect" });
  assert.deepEqual(resolve({ drunkId: null }), {
    kind: "effects",
    effects: [
      { kind: "timed-effect", effect: "safe", playerId: "4", expires: { phase: "day", number: 2 } },
      { kind: "timed-effect", effect: "safe", playerId: "5", expires: { phase: "day", number: 2 } },
    ],
  });
});
