import test from "node:test";
import assert from "node:assert/strict";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

// The count and the seats are the only facts the role may read; every other
// fact throws, so a test fails when the role reads something its rule does not
// need.
function context(
  seats: readonly string[],
  abnormalCount: number,
  overrides: Partial<InformationContext> = {},
): InformationContext {
  const unread = (fact: string) => (): never => {
    throw new Error("the Mathematician read " + fact);
  };
  return {
    actorId: seats[0] ?? "",
    infoKind: "mathematician",
    targetIds: [],
    impaired: false,
    at: { phase: "night", number: 1 },
    seatIds: seats,
    abnormalCount,
    isAlive: unread("who is alive"),
    aliveNeighborIds: unread("the neighbours"),
    registeredTeamOf: unread("a registered team"),
    mayRegisterAs: unread("a team registration"),
    registersAsDemon: unread("a Demon registration"),
    redHerringId: null,
    executedToday: null,
    mayRegisterAsCharacters: unread("a character registration"),
    actualRoleOf: unread("a seat's character"),
    hasPlayer: unread("whether a player exists"),
    ...overrides,
  };
}

function resolve(facts: InformationContext): InformationDecision {
  const information = informationOf(role);
  assert.ok(information, "the module owns the answer");
  return information.resolve(facts);
}

const SEVEN = ["1", "2", "3", "4", "5", "6", "7"];
const UP_TO_SEVEN = [0, 1, 2, 3, 4, 5, 6, 7];

test("the Mathematician module declares its step every night and owns its count (SNV-MATHEMATICIAN-01)", () => {
  for (const night of [1, 2, 5]) {
    assert.deepEqual(nightStepFor(role, night), { target: "none", infoKind: "number" });
    assert.equal(nightResolverFor(role, night), undefined, "the step applies nothing");
    assert.equal(nightArmFor(role, night)?.timing, "any");
  }
  assert.equal(informationOf(role)?.infoKind, "mathematician");
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["night-step", "information"],
  );
});

test("the Mathematician answers the marked count up to the seat count (SNV-MATHEMATICIAN-01)", () => {
  const none = resolve(context(SEVEN, 0));
  assert.deepEqual(none, { kind: "answer", value: 0, possible: UP_TO_SEVEN });

  const two = resolve(context(SEVEN, 2));
  assert.deepEqual(two, { kind: "answer", value: 2, possible: UP_TO_SEVEN });
});

test("an impaired Mathematician returns the true count and every possible answer (SNV-MATHEMATICIAN-02)", () => {
  const healthy = resolve(context(SEVEN, 3));
  const impaired = resolve(context(SEVEN, 3, { impaired: true }));
  assert.deepEqual(impaired, healthy, "the role does not read impairment");
  assert.deepEqual(
    Object.keys(impaired).sort(),
    ["kind", "possible", "value"],
    "the role cannot mark its own answer false",
  );
});
