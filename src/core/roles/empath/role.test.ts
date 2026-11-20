import test from "node:test";
import assert from "node:assert/strict";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

// Seats 1 to 5 in a ring. The context answers for the seats a test names.
function context(
  neighbours: readonly string[],
  teams: Readonly<Record<string, "good" | "evil">>,
  overrides: Partial<InformationContext> = {},
): InformationContext {
  return {
    actorId: "3",
    infoKind: "empath",
    targetIds: [],
    impaired: false,
    at: { phase: "night", number: 1 },
    seatIds: ["1", "2", "3", "4", "5"],
    abnormalCount: 0,
    isAlive: () => true,
    aliveNeighborIds: (playerId) => (playerId === "3" ? neighbours : []),
    registeredTeamOf: (playerId) => teams[playerId] ?? null,
    mayRegisterAs: () => false,
    registersAsDemon: () => false,
    redHerringId: null,
    executedToday: null,
    mayRegisterAsCharacters: () => [],
    actualRoleOf: () => null,
    hasPlayer: () => true,
    ...overrides,
  };
}

function resolve(facts: InformationContext): InformationDecision {
  const information = informationOf(role);
  assert.ok(information, "the module owns the answer");
  return information.resolve(facts);
}

test("the Empath module declares a step without a target for every night (TB-EMPATH-01)", () => {
  assert.deepEqual(nightStepFor(role, 1), { infoKind: "number" });
  assert.deepEqual(nightStepFor(role, 4), { infoKind: "number" });
  assert.equal(nightResolverFor(role, 1), undefined, "the step applies nothing");
  assert.equal("nightStep" in role, false, "the legacy night step is gone");
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["night-step", "information"],
  );
});

test("the Empath counts the evil players among the two living neighbours (TB-EMPATH-01)", () => {
  const possible = [0, 1, 2];
  assert.deepEqual(resolve(context(["2", "4"], { "2": "good", "4": "good" })), {
    kind: "answer",
    value: 0,
    possible,
  });
  assert.deepEqual(resolve(context(["2", "4"], { "2": "evil", "4": "good" })), {
    kind: "answer",
    value: 1,
    possible,
  });
  assert.deepEqual(resolve(context(["1", "5"], { "1": "evil", "5": "evil" })), {
    kind: "answer",
    value: 2,
    possible,
  });
});

test("the Empath counts the team a neighbour registers as, not the character (TB-EMPATH-02)", () => {
  const facts = context(
    ["2", "4"],
    { "2": "good", "4": "evil" },
    { actualRoleOf: (playerId) => (playerId === "2" ? "spy" : "recluse") },
  );
  assert.deepEqual(resolve(facts), { kind: "answer", value: 1, possible: [0, 1, 2] });
});

test("an impaired Empath returns the same answer: the engine asks the host (TB-EMPATH-03)", () => {
  const teams = { "2": "evil", "4": "good" } as const;
  assert.deepEqual(
    resolve(context(["2", "4"], teams, { impaired: true })),
    resolve(context(["2", "4"], teams)),
  );
});

test("the Empath names every number of fingers as a possible answer (TB-EMPATH-03)", () => {
  const decision = resolve(context([], {}));
  assert.equal(decision.kind, "answer");
  if (decision.kind !== "answer") return;
  assert.equal(decision.value, 0);
  assert.deepEqual(decision.possible, [0, 1, 2]);
});
