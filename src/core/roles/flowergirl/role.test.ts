import test from "node:test";
import assert from "node:assert/strict";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

// The day's vote facts are the only thing the role may read; every other fact
// throws, so a test fails when the role reads a Vortox or its own impairment.
function context(
  votesToday: InformationContext["votesToday"],
  overrides: Partial<InformationContext> = {},
): InformationContext {
  const unread = (fact: string) => (): never => {
    throw new Error("the Flowergirl read " + fact);
  };
  return {
    actorId: "1",
    infoKind: "flowergirl",
    targetIds: [],
    impaired: false,
    at: { phase: "night", number: 2 },
    seatIds: ["1", "2", "3", "4", "5", "6", "7", "8"],
    abnormalCount: 0,
    isAlive: unread("who is alive"),
    aliveNeighborIds: unread("the neighbours"),
    registeredTeamOf: unread("a registered team"),
    mayRegisterAs: unread("a team registration"),
    registersAsDemon: unread("a Demon registration"),
    redHerringId: null,
    executedToday: null,
    votesToday,
    twins: null,
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

const YES_NO = [true, false];

test("the Flowergirl module declares its step on every night except the first and owns its yes-or-no answer (SNV-FLOWERGIRL-01)", () => {
  for (const night of [2, 5]) {
    assert.deepEqual(nightStepFor(role, night), { target: "none", infoKind: "yes-no" });
    assert.equal(nightResolverFor(role, night), undefined, "the step applies nothing");
    assert.equal(nightArmFor(role, night)?.timing, "other");
  }
  for (const night of [1]) assert.equal(nightStepFor(role, night), undefined);
  assert.equal(informationOf(role)?.infoKind, "flowergirl");
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["night-step", "information"],
  );
});

test("the Flowergirl answers whether a Demon voted (SNV-FLOWERGIRL-01)", () => {
  assert.deepEqual(resolve(context({ demonVoted: true, minionNominated: false })), {
    kind: "answer",
    value: true,
    possible: YES_NO,
  });
  assert.deepEqual(resolve(context({ demonVoted: false, minionNominated: true })), {
    kind: "answer",
    value: false,
    possible: YES_NO,
  });
});

test("the Flowergirl does not read its own impairment or a Vortox, and treats a missing day as no (SNV-FLOWERGIRL-01)", () => {
  const healthy = resolve(context({ demonVoted: true, minionNominated: false }));
  assert.deepEqual(
    resolve(context({ demonVoted: true, minionNominated: false }, { impaired: true })),
    healthy,
  );
  const missing = resolve(context(null));
  assert.deepEqual(missing, { kind: "answer", value: false, possible: YES_NO });
  assert.deepEqual(Object.keys(missing).sort(), ["kind", "possible", "value"]);
});
