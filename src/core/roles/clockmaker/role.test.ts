import test from "node:test";
import assert from "node:assert/strict";
import type { RoleId } from "../../model/types.ts";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

// The facts a test names: the seats around the circle and each seat's
// character, alive or dead exactly as the role reads it.
function context(
  seats: readonly string[],
  roles: Record<string, RoleId>,
  overrides: Partial<InformationContext> = {},
): InformationContext {
  return {
    actorId: seats[0] ?? "",
    infoKind: "clockmaker",
    targetIds: [],
    impaired: false,
    at: { phase: "night", number: 1 },
    seatIds: seats,
    aliveNeighborIds: () => [],
    registeredTeamOf: () => null,
    mayRegisterAs: () => false,
    registersAsDemon: () => false,
    redHerringId: null,
    executedToday: null,
    mayRegisterAsCharacters: () => [],
    actualRoleOf: (playerId) => roles[playerId] ?? null,
    hasPlayer: (playerId) => seats.includes(playerId),
    isAlive: () => true,
    ...overrides,
  };
}

function resolve(facts: InformationContext): InformationDecision {
  const information = informationOf(role);
  assert.ok(information, "the module owns the answer");
  return information.resolve(facts);
}

const EIGHT = ["1", "2", "3", "4", "5", "6", "7", "8"];
const UP_TO_EIGHT = [0, 1, 2, 3, 4, 5, 6, 7, 8];

test("the Clockmaker module declares its step on the first night only and owns its distance answer (SNV-CLOCKMAKER-01)", () => {
  for (const night of [1]) {
    assert.deepEqual(nightStepFor(role, night), { target: "none", infoKind: "number" });
    assert.equal(nightResolverFor(role, night), undefined, "the step applies nothing");
    assert.equal(nightArmFor(role, night)?.timing, "first");
  }
  for (const night of [2, 5]) assert.equal(nightStepFor(role, night), undefined);
  assert.equal(informationOf(role)?.infoKind, "clockmaker");
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["night-step", "information"],
  );
});

test("the Clockmaker learns the distance from the Demon to its nearest Minion (SNV-CLOCKMAKER-01)", () => {
  const distance = (roles: Record<string, RoleId>, seats: readonly string[] = EIGHT) => {
    const decision = resolve(context(seats, roles));
    assert.equal(decision.kind, "answer");
    return decision.kind === "answer" ? decision.value : null;
  };

  assert.equal(distance({ 6: "vortox", 7: "eviltwin" }, ["1", "2", "3", "4", "5", "6", "7"]), 1);
  assert.equal(distance({ 8: "fanggu", 2: "cerenovus" }), 2);
  assert.equal(distance({ 8: "fanggu", 1: "cerenovus" }), 1, "the last seat is beside the first");
  assert.equal(distance({ 8: "fanggu", 2: "cerenovus", 7: "witch" }), 1, "the nearest Minion wins");
  assert.equal(distance({ 1: "clockmaker" }), 0, "no Minion is no distance");
  assert.equal(distance({ 2: "cerenovus" }), 0, "no Demon is no distance");
});

test("the Clockmaker counts a Minion who is dead but in play (SNV-CLOCKMAKER-03)", () => {
  const decision = resolve(
    context(EIGHT, { 8: "fanggu", 2: "cerenovus" }, { isAlive: (playerId) => playerId !== "2" }),
  );
  assert.deepEqual(decision, { kind: "answer", value: 2, possible: UP_TO_EIGHT });
});

test("the Clockmaker names every number up to the seat count as a possible answer (SNV-CLOCKMAKER-01)", () => {
  assert.deepEqual(resolve(context(EIGHT, { 8: "fanggu", 2: "cerenovus" })), {
    kind: "answer",
    value: 2,
    possible: UP_TO_EIGHT,
  });
});

test("an impaired Clockmaker returns the true distance and every possible answer (SNV-CLOCKMAKER-02)", () => {
  const healthy = resolve(context(EIGHT, { 8: "fanggu", 2: "cerenovus" }));
  const impaired = resolve(context(EIGHT, { 8: "fanggu", 2: "cerenovus" }, { impaired: true }));
  assert.deepEqual(impaired, healthy, "the role does not read impairment");
  assert.deepEqual(
    Object.keys(impaired).sort(),
    ["kind", "possible", "value"],
    "the role cannot mark its own answer false",
  );
});
