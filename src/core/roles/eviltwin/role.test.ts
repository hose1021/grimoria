import test from "node:test";
import assert from "node:assert/strict";
import type { RoleId } from "../../model/types.ts";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

// The Evil Twin reads only the validated pair; every other fact throws, so a
// test fails when the role reads a registration or its own impairment.
function context(
  twins: InformationContext["twins"],
  roles: Record<string, RoleId> = { "1": "clockmaker", "8": "eviltwin" },
  overrides: Partial<InformationContext> = {},
): InformationContext {
  const unread = (fact: string) => (): never => {
    throw new Error("the Evil Twin read " + fact);
  };
  return {
    actorId: "8",
    infoKind: "eviltwin",
    targetIds: [],
    impaired: false,
    at: { phase: "night", number: 1 },
    seatIds: Object.keys(roles),
    abnormalCount: 0,
    isAlive: unread("who is alive"),
    aliveNeighborIds: unread("the neighbours"),
    registeredTeamOf: unread("a registered team"),
    mayRegisterAs: unread("a team registration"),
    registersAsDemon: unread("a Demon registration"),
    redHerringId: null,
    executedToday: null,
    votesToday: null,
    twins,
    mayRegisterAsCharacters: unread("a character registration"),
    actualRoleOf: (playerId) => roles[playerId] ?? null,
    hasPlayer: (playerId) => playerId in roles,
    ...overrides,
  };
}

function resolve(facts: InformationContext): InformationDecision {
  const information = informationOf(role);
  assert.ok(information, "the module owns the answer");
  return information.resolve(facts);
}

test("the Evil Twin module declares its first-night step and owns the introduction (SNV-EVILTWIN-01)", () => {
  for (const night of [1]) {
    assert.deepEqual(nightStepFor(role, night), { target: "none", infoKind: "note" });
    assert.equal(nightResolverFor(role, night), undefined);
    assert.equal(nightArmFor(role, night)?.timing, "first");
  }
  for (const night of [2, 5]) assert.equal(nightStepFor(role, night), undefined);
  assert.equal(informationOf(role)?.infoKind, "eviltwin", "the module owns the answer");
});

test("the introduction names the Evil Twin first and the Good Twin second (SNV-EVILTWIN-01)", () => {
  assert.deepEqual(resolve(context({ goodId: "1", evilId: "8" })), {
    kind: "note",
    text: "Покажите Близнецам друг друга.",
    shown: [
      { playerId: "8", roleId: "eviltwin" },
      { playerId: "1", roleId: "clockmaker" },
    ],
  });
});

test("an unpaired Evil Twin names nobody (SNV-EVILTWIN-01)", () => {
  const decision = resolve(context(null));
  assert.equal(decision.kind, "note");
  assert.equal("shown" in decision, false, "a missing pair shows nothing");
});

test("a shown player without a character carries a null character (SNV-EVILTWIN-01)", () => {
  assert.deepEqual(resolve(context({ goodId: "1", evilId: "8" }, { "1": "clockmaker" })), {
    kind: "note",
    text: "Покажите Близнецам друг друга.",
    shown: [
      { playerId: "8", roleId: null },
      { playerId: "1", roleId: "clockmaker" },
    ],
  });
});
