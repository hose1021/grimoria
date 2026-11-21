import test from "node:test";
import assert from "node:assert/strict";
import { ALL_ROLES } from "../../model/rules.ts";
import type { RoleId } from "../../model/types.ts";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

const CHARACTERS: Record<string, RoleId> = { "1": "ravenkeeper", "2": "chef", "3": "recluse" };

// The facts a test names: the chosen players and the characters each player
// may register as. Every other fact throws, so a test fails when the role
// reads something its rule does not need.
function context(
  targetIds: readonly string[],
  mayBe: Record<string, readonly RoleId[]> = {},
  overrides: Partial<InformationContext> = {},
): InformationContext {
  const unread = (fact: string) => (): never => {
    throw new Error("the Ravenkeeper read " + fact);
  };
  return {
    actorId: "1",
    infoKind: "ravenkeeper",
    targetIds,
    impaired: false,
    at: { phase: "night", number: 2 },
    seatIds: ["1", "2", "3"],
    abnormalCount: 0,
    isAlive: unread("who is alive"),
    aliveNeighborIds: unread("the neighbours"),
    registeredTeamOf: unread("a registered team"),
    mayRegisterAs: unread("a team registration"),
    registersAsDemon: unread("a Demon registration"),
    redHerringId: null,
    executedToday: null,
    votesToday: null,
    twins: null,
    mayRegisterAsCharacters: (playerId) => mayBe[playerId] ?? [CHARACTERS[playerId]!],
    actualRoleOf: (playerId) => CHARACTERS[playerId] ?? null,
    hasPlayer: (playerId) => playerId in CHARACTERS,
    ...overrides,
  };
}

function resolve(facts: InformationContext): InformationDecision {
  const information = informationOf(role);
  assert.ok(information, "the module owns the answer");
  return information.resolve(facts);
}

test("the Ravenkeeper module declares one player and the character shape and keeps its wake (TB-RAVENKEEPER-01)", () => {
  for (const night of [1, 2]) {
    const step = nightStepFor(role, night);
    assert.equal(step?.target, "one-any", "any player, alive or dead");
    assert.equal(step?.infoKind, "character");
    assert.equal(typeof step?.actor, "function", "who wakes is still read from the game");
    assert.equal(nightResolverFor(role, night), undefined, "the step applies nothing");
  }
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["information"],
  );
});

test("the Ravenkeeper learns the chosen player's character (TB-RAVENKEEPER-01)", () => {
  assert.deepEqual(resolve(context(["2"])), {
    kind: "answer",
    value: "chef",
    subjectId: "2",
    possible: ALL_ROLES,
    legal: ["chef"],
  });
  const own = resolve(context(["1"]));
  assert.equal(own.kind === "answer" ? own.value : null, "ravenkeeper", "its own seat is a choice");
});

test("the Ravenkeeper names every character the chosen player may register as (TB-RAVENKEEPER-01)", () => {
  // Ravenkeeper r3125, Example 2: a Recluse is shown as the Scarlet Woman.
  const mayBe: RoleId[] = ["recluse", "scarletwoman", "imp"];
  const decision = resolve(context(["3"], { "3": mayBe }));

  assert.equal(decision.kind, "answer");
  if (decision.kind !== "answer") return;
  assert.equal(decision.value, "recluse", "the answer is the seat's character");
  assert.equal(decision.subjectId, "3");
  assert.deepEqual(decision.legal, mayBe);
  assert.deepEqual(decision.possible, ALL_ROLES, "a false answer may be any character");
});

test("the Ravenkeeper has no answer before a player is chosen (TB-RAVENKEEPER-01)", () => {
  assert.deepEqual(resolve(context([])), { kind: "no-effect" });
  assert.deepEqual(resolve(context(["9"])), { kind: "no-effect" }, "a seat that does not exist");
  const two = resolve(context(["2", "3"]));
  assert.equal(two.kind === "answer" ? two.subjectId : null, "2", "the first chosen player");
});

test("the Ravenkeeper returns the same answer when its owner is impaired (SYS-EFFECTS-01)", () => {
  const mayBe: Record<string, RoleId[]> = { "3": ["recluse", "imp"] };

  assert.deepEqual(
    resolve(context(["3"], mayBe, { impaired: true })),
    resolve(context(["3"], mayBe)),
    "the engine, not the role, decides who answers",
  );
  assert.deepEqual(resolve(context([], {}, { impaired: true })), resolve(context([])));
});
