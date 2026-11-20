import test from "node:test";
import assert from "node:assert/strict";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

// The facts a test names: who registers as a Demon, who is the red herring
// and which seats do not exist.
function context(
  targetIds: readonly string[],
  facts: { demons?: readonly string[]; herring?: string | null; missing?: readonly string[] } = {},
  overrides: Partial<InformationContext> = {},
): InformationContext {
  return {
    actorId: "3",
    infoKind: "fortuneteller",
    targetIds,
    impaired: false,
    at: { phase: "night", number: 1 },
    seatIds: [],
    abnormalCount: 0,
    isAlive: () => true,
    aliveNeighborIds: () => [],
    registeredTeamOf: () => null,
    mayRegisterAs: () => false,
    actualRoleOf: () => null,
    hasPlayer: (playerId) => !(facts.missing ?? []).includes(playerId),
    registersAsDemon: (playerId) => (facts.demons ?? []).includes(playerId),
    redHerringId: facts.herring ?? null,
    executedToday: null,
    votesToday: null,
    mayRegisterAsCharacters: () => [],
    ...overrides,
  };
}

function resolve(facts: InformationContext): InformationDecision {
  const information = informationOf(role);
  assert.ok(information, "the module owns the answer");
  return information.resolve(facts);
}

const yes = { kind: "answer", value: true, possible: [true, false] };
const no = { kind: "answer", value: false, possible: [true, false] };

test("the Fortune Teller module declares a step for two players on every night (TB-FORTUNETELLER-01)", () => {
  assert.deepEqual(nightStepFor(role, 1), { target: "two", infoKind: "yes-no" });
  assert.deepEqual(nightStepFor(role, 4), { target: "two", infoKind: "yes-no" });
  assert.equal(nightResolverFor(role, 1), undefined, "the step applies nothing");
  assert.equal("nightStep" in role, false, "the legacy night step is gone");
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["night-step", "information"],
  );
});

test("the Fortune Teller hears yes when either chosen player registers as a Demon (TB-FORTUNETELLER-01)", () => {
  assert.deepEqual(resolve(context(["7", "1"], { demons: ["7"] })), yes);
  assert.deepEqual(resolve(context(["1", "7"], { demons: ["7"] })), yes);
  assert.deepEqual(resolve(context(["1", "4"], { demons: ["7"] })), no);
  assert.deepEqual(resolve(context([], { demons: ["7"] })), no, "no players chosen yet");
});

test("the Fortune Teller hears yes for the red herring (TB-FORTUNETELLER-01)", () => {
  assert.deepEqual(resolve(context(["5", "1"], { demons: ["7"], herring: "5" })), yes);
  assert.deepEqual(resolve(context(["3", "4"], { herring: "3" })), yes, "their own seat");
  assert.deepEqual(resolve(context(["1", "4"], { demons: ["7"], herring: "5" })), no);
});

test("the Fortune Teller reads who registers as a Demon, not the character (TB-FORTUNETELLER-01, TB-RECLUSE-02)", () => {
  const recluse = context(
    ["2", "4"],
    { demons: ["2"] },
    { actualRoleOf: (playerId) => (playerId === "2" ? "recluse" : "chef") },
  );
  assert.deepEqual(resolve(recluse), yes, "a Recluse the host registered as the Demon");
  const unregistered = context(
    ["2", "4"],
    {},
    { actualRoleOf: (playerId) => (playerId === "2" ? "recluse" : "chef") },
  );
  assert.deepEqual(resolve(unregistered), no);
});

test("a seat that does not exist answers nothing to the Fortune Teller (TB-FORTUNETELLER-01)", () => {
  assert.deepEqual(resolve(context(["99", "1"], { herring: "99", missing: ["99"] })), no);
  assert.deepEqual(resolve(context(["99", "1"], { demons: ["99"], missing: ["99"] })), no);
});

test("an impaired Fortune Teller returns the same answer: the engine asks the host (SYS-EFFECTS-01)", () => {
  const facts = { demons: ["7"], herring: "5" };
  assert.deepEqual(
    resolve(context(["7", "1"], facts, { impaired: true })),
    resolve(context(["7", "1"], facts)),
  );
  assert.deepEqual(resolve(context(["1", "4"], facts, { impaired: true })), no);
});
