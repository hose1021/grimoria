// The seat projection is what the handoff may show: a name, a claim, the shown
// role and the Goon's revealed alignment. A madness token, a real role or any
// other masked identity in the saved game must not appear.
import test from "node:test";
import assert from "node:assert/strict";

import { projectSeats } from "./player-projection.ts";

function seat(roleId: string | null, shownRoleId: string | null, team: string | null) {
  return { name: "P", claimed: false, roleId, shownRoleId, team };
}

test("the player handoff projection carries only public seat data, the shown role and the Goon alignment", () => {
  const game = {
    order: ["1", "2"],
    players: {
      "1": {
        name: "Ada",
        claimed: true,
        roleId: "cerenovus",
        shownRoleId: "clockmaker",
        team: "evil",
      },
      "2": {
        name: "Bo",
        claimed: false,
        roleId: "mutant",
        shownRoleId: "mutant",
        team: "good",
      },
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
  const seats = projectSeats(game);
  assert.deepEqual(Object.keys(seats[0]!).sort(), [
    "claimed",
    "id",
    "name",
    "seat",
    "shownAlignment",
    "shownRoleId",
  ]);
  assert.equal(seats[0]!.shownRoleId, "clockmaker");
  assert.equal(seats[0]!.shownAlignment, null, "another masked role gets no alignment reveal");
  assert.equal(seats[0]!.name, "Ada");
  assert.equal(seats[1]!.seat, 2);
  const text = JSON.stringify(seats);
  assert.equal(text.includes("madness"), false);
  assert.equal(text.includes("cerenovus"), false);
  assert.equal(text.includes("roleId"), false);
  assert.equal(text.includes("team"), false);
});

test("the Goon's own alignment reaches the player handoff (BMR-GOON-01)", () => {
  const good = projectSeats({ order: ["1"], players: { "1": seat("goon", "goon", "good") } });
  assert.equal(good[0]!.shownAlignment, "good");
  const evil = projectSeats({ order: ["1"], players: { "1": seat("goon", "goon", "evil") } });
  assert.equal(evil[0]!.shownAlignment, "evil");
});

test("the Lunatic's mask and every non-Goon seat hide their alignment (BMR-LUNATIC-01)", () => {
  const lunatic = projectSeats({
    order: ["1"],
    players: { "1": seat("lunatic", "imp", "good") },
  });
  assert.equal(lunatic[0]!.shownRoleId, "imp");
  assert.equal(lunatic[0]!.shownAlignment, null, "the Lunatic believes the mask, not the team");

  const imp = projectSeats({ order: ["1"], players: { "1": seat("imp", "imp", "evil") } });
  assert.equal(imp[0]!.shownAlignment, null, "a Demon needs no alignment reveal");
});

test("the player handoff never receives the Fortune Teller's red herring (TB-FORTUNETELLER-01)", () => {
  const game = {
    order: ["1", "2"],
    players: {
      "1": seat("fortuneteller", "fortuneteller", "good"),
      "2": seat("chef", "chef", "good"),
    },
    setup: { herringId: "2" },
  };
  const seats = projectSeats(game);
  assert.equal(seats[0]!.shownRoleId, "fortuneteller");
  assert.equal(JSON.stringify(seats).includes("herring"), false);
  assert.equal(JSON.stringify(seats).includes("setup"), false);
});
