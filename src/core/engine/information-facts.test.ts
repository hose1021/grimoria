import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../model/state.ts";
import type { GameState, LastDay, Nomination, RoleId } from "../model/types.ts";
import { informationFacts, votesOn } from "./information-facts.ts";

function stateWith(
  lastDay: LastDay | null,
  roles: Record<string, RoleId> = {},
  number: number = 1,
): GameState {
  const state = createGame(8);
  for (const [id, roleId] of Object.entries(roles)) state.players[id]!.roleId = roleId;
  state.night.number = number;
  state.lastDay = lastDay;
  return state;
}

function nomination(overrides: Partial<Nomination> = {}): Nomination {
  return {
    id: "n1",
    nominatorId: "2",
    nomineeId: "3",
    at: "2026-01-01T00:00:00.000Z",
    votes: [],
    count: 0,
    threshold: 3,
    recorded: true,
    ...overrides,
  };
}

function day(nominations: Nomination[], overrides: Partial<LastDay> = {}): LastDay {
  return { number: 1, nominations, execution: null, ...overrides };
}

test("votesOn is null without an ended day, for another day number, and for a broken day record", () => {
  assert.equal(votesOn(stateWith(null), 1), null);
  assert.equal(votesOn(stateWith(day([], { number: 2 })), 1), null);
  const broken = day([]);
  Reflect.set(broken, "nominations", "none");
  assert.equal(votesOn(stateWith(broken), 1), null);
});

test("votesOn is null when the day records aggregate totals, empty or not", () => {
  for (const voteCounts of [{}, { 2: 5 }] as Array<Record<string, number>>) {
    assert.equal(votesOn(stateWith(day([], { voteCounts })), 1), null);
  }
});

test("votesOn reads the Demon voters recorded at vote time", () => {
  const voted = votesOn(
    stateWith(day([nomination({ demonVoters: ["8"], votes: ["8"] })]), { 8: "fanggu" }),
    1,
  );
  assert.deepEqual(voted, { demonVoted: true, minionNominated: false });
  const silent = votesOn(stateWith(day([nomination({ demonVoters: [] })])), 1);
  assert.deepEqual(silent, { demonVoted: false, minionNominated: false });
});

test("votesOn reads whether the nominator was a Minion at vote time", () => {
  const nominated = votesOn(
    stateWith(day([nomination({ minionNomination: true })]), { 2: "cerenovus" }),
    1,
  );
  assert.deepEqual(nominated, { demonVoted: false, minionNominated: true });
  const notMinion = votesOn(
    stateWith(day([nomination({ minionNomination: false })]), { 2: "cerenovus" }),
    1,
  );
  assert.deepEqual(notMinion, { demonVoted: false, minionNominated: false });
});

test("votesOn falls back to the current roles of the voters and the nominator", () => {
  // A legacy nomination recorded no vote-time snapshot. The Demon seat in the
  // votes and the Minion seat as nominator still answer, as before the move.
  const legacy = votesOn(
    stateWith(day([nomination({ nominatorId: "7", votes: ["8", "1"] })]), {
      7: "cerenovus",
      8: "fanggu",
    }),
    1,
  );
  assert.deepEqual(legacy, { demonVoted: true, minionNominated: true });
  // A seat that only later became the Demon did not vote as one.
  const changed = votesOn(
    stateWith(day([nomination({ nominatorId: "2", votes: ["3"] })]), {
      2: "clockmaker",
      3: "scapegoat" as RoleId,
      8: "fanggu",
    }),
    1,
  );
  assert.deepEqual(changed, { demonVoted: false, minionNominated: false });
});

test("informationFacts returns the validated twins and null when the caller has none", () => {
  const state = stateWith(null);
  const query = {
    actorId: "8",
    infoKind: "eviltwin",
    targetIds: [],
    registrations: {},
    impaired: false,
    at: { phase: "night", number: 1 },
  } as const;
  assert.equal(informationFacts(state, query).twins, null, "no pair by default");
  assert.deepEqual(
    informationFacts(state, { ...query, twins: { goodId: "1", evilId: "8" } }).twins,
    { goodId: "1", evilId: "8" },
    "the caller's validated pair passes through",
  );
});
