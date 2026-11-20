import test from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_ROLES, roleTeam } from "../../model/rules.ts";
import type { DeadAt } from "../../model/types.ts";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightArmFor, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

const GOOD = SUPPORTED_ROLES.filter(
  (id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider",
);
const EVIL = SUPPORTED_ROLES.filter((id) => roleTeam(id) === "minion" || roleTeam(id) === "demon");

// The facts a test names: the seats around the circle and what the target may
// register as. The role reads the pools and the target, never the truth.
function context(
  seats: readonly string[],
  overrides: Partial<InformationContext> = {},
): InformationContext {
  return {
    actorId: "1",
    infoKind: "dreamer",
    targetIds: [],
    impaired: false,
    at: { phase: "night", number: 1 } as DeadAt,
    seatIds: seats,
    abnormalCount: 0,
    aliveNeighborIds: () => [],
    registeredTeamOf: () => null,
    mayRegisterAs: () => false,
    registersAsDemon: () => false,
    redHerringId: null,
    executedToday: null,
    votesToday: null,
    mayRegisterAsCharacters: () => [],
    actualRoleOf: () => null,
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

test("the Dreamer module declares its step on every night and owns the role-pair answer (SNV-DREAMER-01)", () => {
  for (const night of [1, 2, 5]) {
    assert.deepEqual(nightStepFor(role, night), { target: "one-any", infoKind: "note" });
    assert.equal(nightResolverFor(role, night), undefined);
    assert.equal(nightArmFor(role, night)?.timing, "any");
  }
  assert.equal(informationOf(role)?.infoKind, "dreamer");
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["night-step", "information"],
  );
});

test("the Dreamer names the target, the two pools and the registration facts, not the pair (SNV-DREAMER-01)", () => {
  const decision = resolve(
    context(["1", "2"], {
      targetIds: ["2"],
      mayRegisterAsCharacters: (playerId) => (playerId === "2" ? ["clockmaker"] : []),
    }),
  );
  assert.deepEqual(decision, {
    kind: "role-pair",
    subjectId: "2",
    good: GOOD,
    evil: EVIL,
    possible: ["clockmaker"],
  });
  assert.equal("pair" in decision, false, "the role does not choose the pair");
  assert.equal("value" in decision, false, "the role does not choose the correct character");
  assert.equal("options" in decision, false, "the role names no step option");
});

test("an impaired Dreamer gives the same pools and registration facts (SNV-DREAMER-01)", () => {
  const facts = context(["1", "2"], {
    targetIds: ["2"],
    impaired: true,
    mayRegisterAsCharacters: () => ["clockmaker"],
  });
  assert.deepEqual(resolve({ ...facts, impaired: false }), resolve(facts));
});

test("the Dreamer passes the Spy and Recluse registration facts through (SNV-DREAMER-01, TB-SPY-01, TB-RECLUSE-01)", () => {
  const decision = resolve(
    context(["1", "2"], {
      targetIds: ["2"],
      mayRegisterAsCharacters: () => ["spy", ...GOOD],
    }),
  );
  assert.equal(decision.kind, "role-pair");
  if (decision.kind !== "role-pair") return;
  assert.deepEqual(decision.possible, ["spy", ...GOOD]);
});

test("the Dreamer asks for no pair without a seat to read (SNV-DREAMER-01)", () => {
  assert.deepEqual(resolve(context(["1", "2"])), { kind: "no-effect" });
  assert.deepEqual(
    resolve(context(["1", "2"], { targetIds: ["9"] })),
    { kind: "no-effect" },
    "a seat that is not in the game",
  );
});
