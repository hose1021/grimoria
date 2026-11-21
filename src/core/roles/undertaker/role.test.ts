import test from "node:test";
import assert from "node:assert/strict";
import { ALL_ROLES } from "../../model/rules.ts";
import type { RoleId } from "../../model/types.ts";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

type Executed = InformationContext["executedToday"];

// The facts a test names: who died by execution today, and the characters
// each player may register as. Every other fact throws, so a test fails when
// the role reads something its rule does not need.
function context(
  executedToday: Executed,
  mayBe: Record<string, readonly RoleId[]> = {},
  overrides: Partial<InformationContext> = {},
): InformationContext {
  const unread = (fact: string) => (): never => {
    throw new Error("the Undertaker read " + fact);
  };
  return {
    actorId: "1",
    infoKind: "undertaker",
    targetIds: [],
    impaired: false,
    at: { phase: "night", number: 2 },
    seatIds: ["1", "2", "3", "4", "5"],
    abnormalCount: 0,
    isAlive: unread("who is alive"),
    aliveNeighborIds: unread("the neighbours"),
    registeredTeamOf: unread("a registered team"),
    mayRegisterAs: unread("a team registration"),
    registersAsDemon: unread("a Demon registration"),
    redHerringId: null,
    executedToday,
    votesToday: null,
    twins: null,
    mayRegisterAsCharacters: (playerId) => mayBe[playerId] ?? [],
    actualRoleOf: unread("a seat's character"),
    hasPlayer: () => true,
    ...overrides,
  };
}

function resolve(facts: InformationContext): InformationDecision {
  const information = informationOf(role);
  assert.ok(information, "the module owns the answer");
  return information.resolve(facts);
}

test("the Undertaker module declares the character shape and keeps its wake (TB-UNDERTAKER-01)", () => {
  const step = nightStepFor(role, 2);
  assert.equal(step?.infoKind, "character");
  assert.equal(step?.target, undefined, "the Undertaker chooses nobody");
  assert.equal(typeof step?.actor, "function", "who wakes is still read from the game");
  assert.equal(nightResolverFor(role, 2), undefined, "the step applies nothing");
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["information"],
  );
});

test("the Undertaker learns the character that died by execution today (TB-UNDERTAKER-01)", () => {
  assert.deepEqual(resolve(context({ playerId: "2", roleId: "chef" }, { "2": ["chef"] })), {
    kind: "answer",
    value: "chef",
    subjectId: "2",
    possible: ALL_ROLES,
    legal: ["chef"],
  });
  const drunk = resolve(context({ playerId: "4", roleId: "drunk" }, { "4": ["drunk"] }));
  assert.equal(drunk.kind, "answer");
  assert.equal(
    drunk.kind === "answer" ? drunk.value : null,
    "drunk",
    "the Drunk, not the Townsfolk the Drunk was shown",
  );
});

test("the Undertaker names every character the executed player may register as (TB-UNDERTAKER-01)", () => {
  // Undertaker r3115, Example 3: an executed Spy is shown as the Butler.
  const mayBe: RoleId[] = ["spy", "washerwoman", "butler"];
  const decision = resolve(context({ playerId: "3", roleId: "spy" }, { "3": mayBe }));

  assert.equal(decision.kind, "answer");
  if (decision.kind !== "answer") return;
  assert.equal(decision.value, "spy", "the answer is the character on record");
  assert.deepEqual(decision.legal, mayBe);
  assert.deepEqual(decision.possible, ALL_ROLES, "a false answer may be any character");
});

test("the Undertaker reads the character recorded at the death (TB-UNDERTAKER-01)", () => {
  // The seat's character now is the engine's fact for the registration; the
  // answer is the character that died.
  const decision = resolve(context({ playerId: "2", roleId: "chef" }, { "2": ["empath"] }));

  assert.equal(decision.kind, "answer");
  if (decision.kind !== "answer") return;
  assert.equal(decision.value, "chef");
  assert.deepEqual(decision.legal, ["empath"]);
});

test("without an execution death the Undertaker has a note and no answer (TB-UNDERTAKER-01)", () => {
  assert.deepEqual(resolve(context(null)), {
    kind: "note",
    text: "Сегодня казни со смертью не было.",
  });
  assert.deepEqual(resolve(context({ playerId: "2", roleId: null })), { kind: "no-effect" });
});

test("the Undertaker returns the same answer when its owner is impaired (SYS-EFFECTS-01)", () => {
  const executed = { playerId: "2", roleId: "recluse" } as const;
  const mayBe: Record<string, RoleId[]> = { "2": ["recluse", "imp"] };

  assert.deepEqual(
    resolve(context(executed, mayBe, { impaired: true })),
    resolve(context(executed, mayBe)),
    "the engine, not the role, decides who answers",
  );
  assert.deepEqual(resolve(context(null, {}, { impaired: true })), resolve(context(null)));
});
