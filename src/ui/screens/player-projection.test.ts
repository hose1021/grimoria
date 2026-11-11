// The seat projection is what the handoff may show: a name, a claim and the
// shown role. A madness token or a real role in the saved game must not appear.
import test from "node:test";
import assert from "node:assert/strict";

import { projectSeats } from "./player-projection.ts";

const game = {
  order: ["1", "2"],
  players: {
    "1": { name: "Ada", claimed: true, shownRoleId: "clockmaker", roleId: "cerenovus" },
    "2": { name: "Bo", claimed: false, shownRoleId: "mutant", roleId: "mutant" },
  },
  effects: [
    {
      id: "eff-madness-cerenovus-1-1-1",
      kind: "madness",
      madness: "cerenovus",
      sourceId: "1",
      targetId: "1",
      roleId: "clockmaker",
    },
  ],
};

test("the player handoff projection carries only public seat data and the shown role", () => {
  const seats = projectSeats(game);
  assert.deepEqual(Object.keys(seats[0]!).sort(), ["claimed", "id", "name", "seat", "shownRoleId"]);
  assert.equal(seats[0]!.shownRoleId, "clockmaker");
  assert.equal(seats[0]!.name, "Ada");
  assert.equal(seats[1]!.seat, 2);
  const text = JSON.stringify(seats);
  assert.equal(text.includes("madness"), false);
  assert.equal(text.includes("cerenovus"), false);
  assert.equal(text.includes("roleId"), false);
});
