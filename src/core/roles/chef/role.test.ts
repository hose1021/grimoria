import test from "node:test";
import assert from "node:assert/strict";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { informationOf, nightResolverFor, nightStepFor } from "../night-step.ts";
import { role } from "./role.ts";

// The facts a test names: the seats around the circle, who registers as evil
// under the host's registrations, and who may register as the other team.
function context(
  seats: readonly string[],
  facts: {
    evil?: readonly string[];
    mayBeEvil?: readonly string[];
    mayBeGood?: readonly string[];
  } = {},
  overrides: Partial<InformationContext> = {},
): InformationContext {
  const evil = facts.evil ?? [];
  const mayBeEvil = facts.mayBeEvil ?? evil;
  const mayBeGood = facts.mayBeGood ?? seats.filter((seat) => !evil.includes(seat));
  return {
    actorId: seats[0] ?? "",
    infoKind: "chef",
    targetIds: [],
    impaired: false,
    at: { phase: "night", number: 1 },
    seatIds: seats,
    abnormalCount: 0,
    isAlive: (playerId) => seats.includes(playerId),
    aliveNeighborIds: () => [],
    registeredTeamOf: (playerId) =>
      seats.includes(playerId) ? (evil.includes(playerId) ? "evil" : "good") : null,
    mayRegisterAs: (playerId, team) => (team === "evil" ? mayBeEvil : mayBeGood).includes(playerId),
    registersAsDemon: () => false,
    redHerringId: null,
    executedToday: null,
    mayRegisterAsCharacters: () => [],
    actualRoleOf: () => null,
    hasPlayer: (playerId) => seats.includes(playerId),
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

test("the Chef module declares a step for the first night only, with the number shape (TB-CHEF-01)", () => {
  assert.deepEqual(nightStepFor(role, 1), { infoKind: "number" });
  assert.equal(nightStepFor(role, 2), undefined, "the Chef starts knowing");
  assert.equal(nightResolverFor(role, 1), undefined, "the step applies nothing");
  assert.equal("nightStep" in role, false, "the legacy night step is gone");
  assert.deepEqual(
    role.capabilities.map((capability) => capability.kind),
    ["night-step", "information"],
  );
});

test("the Chef counts each pair of neighbouring players who register as evil (TB-CHEF-01)", () => {
  const count = (evil: readonly string[]) => {
    const decision = resolve(context(SEVEN, { evil }));
    assert.equal(decision.kind, "answer");
    return decision.kind === "answer" ? decision.value : null;
  };

  assert.equal(count([]), 0);
  assert.equal(count(["6"]), 0, "one evil player is no pair");
  assert.equal(count(["2", "6"]), 0, "evil players apart");
  assert.equal(count(["6", "7"]), 1);
  assert.equal(count(["1", "7"]), 1, "the last seat is beside the first");
  assert.equal(count(["5", "6", "7"]), 2, "three in a row are two pairs");
  assert.equal(count(["7", "1", "2"]), 2, "a row across the first seat");
  assert.equal(count(["1", "2", "4", "5"]), 2, "two separate pairs");
  assert.equal(count(SEVEN), 7, "a full circle of evil has as many pairs as seats");
});

test("the Chef names every number up to the seat count as a possible answer (TB-CHEF-01, SYS-EFFECTS-01)", () => {
  assert.deepEqual(resolve(context(SEVEN, { evil: ["6", "7"] })), {
    kind: "answer",
    value: 1,
    possible: UP_TO_SEVEN,
    legal: [1],
  });
  const five = resolve(context(["1", "2", "3", "4", "5"]));
  assert.deepEqual(five, { kind: "answer", value: 0, possible: [0, 1, 2, 3, 4, 5], legal: [0] });
});

test("the Chef counts the team a player registers as, not the character (TB-CHEF-01, TB-SPY-01, TB-RECLUSE-01)", () => {
  const spyAsGood = resolve(
    context(
      SEVEN,
      { evil: ["2"] },
      { actualRoleOf: (playerId) => (playerId === "1" ? "spy" : "imp") },
    ),
  );
  assert.equal(spyAsGood.kind === "answer" && spyAsGood.value, 0);
  const recluseAsEvil = resolve(
    context(
      SEVEN,
      { evil: ["1", "2"] },
      {
        actualRoleOf: (playerId) => (playerId === "1" ? "recluse" : "imp"),
      },
    ),
  );
  assert.equal(recluseAsEvil.kind === "answer" && recluseAsEvil.value, 1);
});

test("a player who may register either way gives the Chef a range of legal counts (TB-CHEF-02)", () => {
  // Chef r2510, Example 4: the Recluse at 1 sits between the Imp at 2 and the
  // Poisoner at 8, and may register as evil for one pair and good for the other.
  const eight = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const recluse = resolve(context(eight, { evil: ["2", "8"], mayBeEvil: ["1", "2", "8"] }));
  assert.deepEqual(recluse, {
    kind: "answer",
    value: 0,
    possible: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    legal: [0, 1, 2],
  });

  // A Spy at 1 beside the Imp at 2 may register as good.
  const spy = resolve(
    context(eight, { evil: ["1", "2"], mayBeGood: ["1", "3", "4", "5", "6", "7", "8"] }),
  );
  assert.deepEqual(spy.kind === "answer" && [spy.value, spy.legal], [1, [0, 1]]);

  // Three evil players in a row with a Spy in the middle: both pairs may go.
  const middle = resolve(
    context(SEVEN, { evil: ["5", "6", "7"], mayBeGood: ["1", "2", "3", "4", "6"] }),
  );
  assert.deepEqual(middle.kind === "answer" && [middle.value, middle.legal], [2, [0, 1, 2]]);

  // A Spy at the end of the row frees one pair only.
  const end = resolve(
    context(SEVEN, { evil: ["5", "6", "7"], mayBeGood: ["1", "2", "3", "4", "7"] }),
  );
  assert.deepEqual(end.kind === "answer" && [end.value, end.legal], [2, [1, 2]]);
});

test("the Chef's count follows the host's registration and the legal range does not (TB-CHEF-02)", () => {
  const eight = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const registered = resolve(
    context(eight, {
      evil: ["1", "2", "8"],
      mayBeEvil: ["1", "2", "8"],
      mayBeGood: ["1", "3", "4", "5", "6", "7"],
    }),
  );
  assert.deepEqual(registered.kind === "answer" && [registered.value, registered.legal], [
    2,
    [0, 1, 2],
  ]);
});

test("an impaired Chef returns the same answer: the engine asks the host (SYS-EFFECTS-01)", () => {
  const facts = { evil: ["2", "8"], mayBeEvil: ["1", "2", "8"] };
  const eight = ["1", "2", "3", "4", "5", "6", "7", "8"];
  assert.deepEqual(
    resolve(context(eight, facts, { impaired: true })),
    resolve(context(eight, facts)),
  );
});
