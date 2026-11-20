import test from "node:test";
import assert from "node:assert/strict";
import { roleTeam } from "../../model/rules.ts";
import type { RoleId } from "../../model/types.ts";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

// The facts a test names: the seats around the circle, each seat's character
// and whether that player is alive.
function context(
  seats: readonly string[],
  roles: Record<string, RoleId>,
  alive: readonly string[],
  overrides: Partial<InformationContext> = {},
): InformationContext {
  return {
    actorId: seats[0] ?? "",
    infoKind: "oracle",
    targetIds: [],
    impaired: false,
    at: { phase: "night", number: 2 },
    seatIds: seats,
    aliveNeighborIds: () => [],
    registeredTeamOf: (playerId) => {
      const roleId = roles[playerId];
      if (!roleId) return null;
      const team = roleTeam(roleId);
      return team === "minion" || team === "demon" ? "evil" : "good";
    },
    mayRegisterAs: () => false,
    registersAsDemon: () => false,
    redHerringId: null,
    executedToday: null,
    mayRegisterAsCharacters: () => [],
    actualRoleOf: (playerId) => roles[playerId] ?? null,
    hasPlayer: (playerId) => seats.includes(playerId),
    isAlive: (playerId) => alive.includes(playerId),
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

test("the Oracle module declares its step on every night except the first and owns its count (SNV-ORACLE-01)", () => {
  for (const night of [2, 5]) {
    assert.deepEqual(nightStepFor(role, night), { target: "none", infoKind: "number" });
    assert.equal(nightResolverFor(role, night), undefined, "the step applies nothing");
    assert.equal(nightArmFor(role, night)?.timing, "other");
  }
  for (const night of [1]) assert.equal(nightStepFor(role, night), undefined);
  assert.equal(informationOf(role)?.infoKind, "oracle");
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["night-step", "information"],
  );
});

test("the Oracle counts dead evil players, not death events (SNV-ORACLE-01)", () => {
  const roles: Record<string, RoleId> = {
    1: "clockmaker",
    2: "oracle",
    5: "saint",
    7: "cerenovus",
    8: "fanggu",
  };
  const count = (alive: readonly string[]) => {
    const decision = resolve(context(EIGHT, roles, alive));
    assert.equal(decision.kind, "answer");
    return decision.kind === "answer" ? decision.value : null;
  };

  assert.equal(count(EIGHT), 0, "a living evil player is not counted");
  assert.equal(count(EIGHT.filter((id) => id !== "7")), 1, "one dead Minion");
  assert.equal(count(EIGHT.filter((id) => id !== "5")), 0, "a dead good player is not evil");
  assert.equal(
    count(EIGHT.filter((id) => id !== "5" && id !== "7")),
    1,
    "only the dead evil player counts",
  );
  assert.equal(count(EIGHT.filter((id) => id !== "7" && id !== "8")), 2, "a dead Demon counts too");
});

test("the Oracle names every number up to the seat count as a possible answer (SNV-ORACLE-01)", () => {
  const decision = resolve(
    context(
      EIGHT,
      { 2: "oracle", 8: "fanggu" },
      EIGHT.filter((id) => id !== "8"),
    ),
  );
  assert.deepEqual(decision, { kind: "answer", value: 1, possible: UP_TO_EIGHT });
});

test("an impaired Oracle returns the true count and every possible answer (SNV-ORACLE-01)", () => {
  const roles: Record<string, RoleId> = { 2: "oracle", 7: "cerenovus", 8: "fanggu" };
  const alive = EIGHT.filter((id) => id !== "7");
  const healthy = resolve(context(EIGHT, roles, alive));
  const impaired = resolve(context(EIGHT, roles, alive, { impaired: true }));
  assert.deepEqual(impaired, healthy, "the role does not read impairment");
  assert.deepEqual(
    Object.keys(impaired).sort(),
    ["kind", "possible", "value"],
    "the role cannot mark its own answer false",
  );
});
