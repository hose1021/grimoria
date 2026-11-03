import test from "node:test";
import assert from "node:assert/strict";
import { buildOrder, advanceNight } from "./night.js";

const catalog = [
  { id: "empath", name: "Empath", team: "townsfolk", firstNight: 56, firstNightReminder: "Give a finger signal.", otherNight: 76, otherNightReminder: "Give a finger signal." },
  { id: "poisoner", name: "Poisoner", team: "minion", firstNight: 33, firstNightReminder: "The Poisoner chooses a player.", otherNight: 17, otherNightReminder: "The Poisoner chooses a player." },
  { id: "chef", name: "Chef", team: "townsfolk", firstNight: 55, firstNightReminder: "Give a finger signal." },
  { id: "monk", name: "Monk", team: "townsfolk", otherNight: 24, otherNightReminder: "The Monk chooses a player." },
  { id: "imp", name: "Imp", team: "demon", otherNight: 40, otherNightReminder: "The Imp chooses a player." },
  { id: "soldier", name: "Soldier", team: "townsfolk" },
  { id: "mayor", name: "Mayor", team: "townsfolk" }
];

const players = [
  { roleId: "empath" },
  { roleId: "imp" },
  { roleId: "chef" },
  { roleId: "soldier" },
  { roleId: "mayor" },
  { roleId: "empath" }
];

test("night 1 keeps first-night roles, sorted, deduplicated, skipping non-wakers", () => {
  const order = buildOrder(players, catalog, 1);
  assert.deepEqual(
    order.map((row) => row.roleId),
    ["chef", "empath"]
  );
  assert.deepEqual(order[1], {
    roleId: "empath",
    role: "Empath",
    step: "Give a finger signal.",
    done: false
  });
  assert.ok(order.every((row) => row.done === false));
});

test("night 2 keeps other-night roles, including the Imp", () => {
  const order = buildOrder(players, catalog, 2);
  assert.deepEqual(
    order.map((row) => row.roleId),
    ["imp", "empath"]
  );
  assert.equal(order[0].role, "Imp");
  assert.equal(order[0].step, "The Imp chooses a player.");
});

test("empty and roleless players produce an empty order", () => {
  assert.deepEqual(buildOrder([], catalog, 1), []);
  assert.deepEqual(buildOrder([{ roleId: null }], catalog, 1), []);
});

test("advanceNight rebuilds the order and appends a log entry", () => {
  const state = {
    night: 1,
    order: ["1", "2"],
    players: {
      "1": { roleId: "empath" },
      "2": { roleId: "imp" }
    },
    nightOrder: [],
    log: []
  };

  const order = advanceNight(state, catalog);

  assert.equal(state.night, 2);
  assert.deepEqual(order.map((row) => row.roleId), ["imp", "empath"]);
  assert.equal(state.nightOrder, order);
  assert.equal(state.log.length, 1);
  assert.equal(state.log[0].phase, "Night 2");
  assert.equal(state.log[0].title, "Night 2 begins");
  assert.equal(state.log[0].done, false);

  const next = advanceNight(state, catalog);
  assert.equal(state.night, 3);
  assert.deepEqual(next.map((row) => row.roleId), ["imp", "empath"]);
  assert.equal(state.log.length, 2);
});
