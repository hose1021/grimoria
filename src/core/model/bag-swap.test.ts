import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_ROLES,
  BMR_ALL,
  SNV_ALL,
  bagErrors,
  roleTeam,
  swapBagRole,
  swapCandidates,
} from "./rules.ts";
import type { SwappableBag } from "./rules.ts";

// Swapping one rolled role keeps the setup-sheet composition (Setup r1361) and
// the modifiers on Baron r2961, Godfather r2394, Fang Gu r2974 and
// Vigormortis r3015. The Drunk's mask stays out of play (Drunk r3165) and the
// Demon's bluffs stay unused good roles. Source: openspec change
// setup-random-swap.

const fixed = () => 0;

function bag(partial: Partial<SwappableBag> & { count: number; roles: string[] }): SwappableBag {
  return {
    bluffs: [],
    drunkShownId: null,
    lunaticShownId: null,
    lunaticShownExplicit: false,
    lunaticBluffs: [],
    evilTwinGoodId: null,
    godfatherOutsider: 1,
    ...partial,
  };
}

test("a rolled role is offered only same-type roles that keep the composition", () => {
  const roles = [
    "grandmother",
    "sailor",
    "courtier",
    "gossip",
    "fool",
    "devilsadvocate",
    "zombuul",
  ];
  const townsfolk = swapCandidates({ count: 7, roles, pool: BMR_ALL, from: "sailor" });
  assert.ok(townsfolk.length > 0);
  assert.ok(townsfolk.every((id) => roleTeam(id) === "townsfolk" && !roles.includes(id)));

  const minions = swapCandidates({ count: 7, roles, pool: BMR_ALL, from: "devilsadvocate" });
  assert.deepEqual(
    minions.sort(),
    ["assassin", "mastermind"],
    "the Godfather would need an Outsider",
  );

  const demons = swapCandidates({ count: 7, roles, pool: BMR_ALL, from: "zombuul" });
  assert.deepEqual(demons.sort(), ["po", "pukka", "shabaloth"]);

  const tb = ["washerwoman", "chef", "empath", "monk", "slayer", "poisoner", "imp"];
  assert.ok(
    !swapCandidates({ count: 7, roles: tb, pool: ALL_ROLES, from: "poisoner" }).includes("baron"),
    "the Baron would need two Outsiders",
  );
  assert.deepEqual(swapCandidates({ count: 7, roles: tb, pool: ALL_ROLES, from: "nobody" }), []);
});

test("a swap that changes the Outsider count is offered once the counts allow it", () => {
  const withOutsider = [
    "artist",
    "dreamer",
    "oracle",
    "sage",
    "mutant",
    "witch",
    "vortox",
    "savant",
  ];
  // 8 players: 5 Townsfolk, 1 Outsider. Vigormortis removes that Outsider.
  const demons = swapCandidates({ count: 8, roles: withOutsider, pool: SNV_ALL, from: "vortox" });
  assert.ok(!demons.includes("vigormortis"), "Vigormortis would need one Outsider fewer");
  assert.ok(!demons.includes("fanggu"), "Fang Gu would need one Outsider more");
  assert.ok(demons.includes("nodashii"));
});

test("swapping keeps every other choice and repairs only what broke", () => {
  const before = bag({
    count: 8,
    roles: [
      "grandmother",
      "sailor",
      "courtier",
      "gossip",
      "minstrel",
      "goon",
      "devilsadvocate",
      "po",
    ],
    bluffs: ["professor", "fool", "pacifist"],
  });
  const after = swapBagRole(before, "sailor", "professor", BMR_ALL, fixed);
  assert.ok(after);
  assert.deepEqual(after.roles, [
    "grandmother",
    "professor",
    "courtier",
    "gossip",
    "minstrel",
    "goon",
    "devilsadvocate",
    "po",
  ]);
  assert.equal(after.bluffs.length, 3);
  assert.ok(after.bluffs.includes("fool") && after.bluffs.includes("pacifist"));
  assert.ok(!after.bluffs.includes("professor"), "an in-play role is no bluff");
  assert.deepEqual(
    bagErrors({ count: 8, roles: after.roles, bluffs: after.bluffs, pool: BMR_ALL }),
    [],
  );
  assert.equal(swapBagRole(before, "devilsadvocate", "godfather", BMR_ALL, fixed), null);
});

test("the Drunk's mask is redrawn only when the swap puts it in play", () => {
  const before = bag({
    count: 8,
    roles: ["washerwoman", "chef", "empath", "monk", "ravenkeeper", "drunk", "poisoner", "imp"],
    drunkShownId: "slayer",
    bluffs: ["virgin", "soldier", "mayor"],
  });
  const kept = swapBagRole(before, "monk", "undertaker", ALL_ROLES, fixed);
  assert.equal(kept?.drunkShownId, "slayer");

  const broken = swapBagRole(before, "monk", "slayer", ALL_ROLES, fixed);
  assert.ok(broken?.drunkShownId);
  assert.notEqual(broken.drunkShownId, "slayer");
  assert.ok(!broken.roles.includes(broken.drunkShownId));
  assert.ok(!broken.bluffs.includes(broken.drunkShownId), "the mask is no bluff");
  assert.deepEqual(
    bagErrors({
      count: 8,
      roles: broken.roles,
      bluffs: broken.bluffs,
      drunkShownId: broken.drunkShownId,
      pool: ALL_ROLES,
    }),
    [],
  );

  const sober = swapBagRole(before, "drunk", "saint", ALL_ROLES, fixed);
  assert.equal(sober?.drunkShownId, null);
});

test("the Lunatic and the Evil Twin follow the swapped bag", () => {
  const lunaticBag = bag({
    count: 8,
    roles: [
      "grandmother",
      "sailor",
      "courtier",
      "gossip",
      "minstrel",
      "lunatic",
      "assassin",
      "zombuul",
    ],
    lunaticShownId: "zombuul",
    lunaticBluffs: ["sailor", "fool", "tealady"],
  });
  const demonSwap = swapBagRole(lunaticBag, "zombuul", "po", BMR_ALL, fixed);
  assert.equal(demonSwap?.lunaticShownId, "po", "an automatic mask follows the real Demon");
  assert.deepEqual(demonSwap?.lunaticBluffs, ["sailor", "fool", "tealady"]);
  const explicit = swapBagRole(
    { ...lunaticBag, lunaticShownId: "pukka", lunaticShownExplicit: true },
    "zombuul",
    "po",
    BMR_ALL,
    fixed,
  );
  assert.equal(explicit?.lunaticShownId, "pukka", "the Storyteller's chosen mask stays");

  const twinBag = bag({
    count: 7,
    roles: ["artist", "dreamer", "oracle", "sage", "savant", "eviltwin", "vortox"],
    evilTwinGoodId: "sage",
  });
  assert.equal(swapBagRole(twinBag, "sage", "juggler", SNV_ALL, fixed)?.evilTwinGoodId, "juggler");
  assert.equal(swapBagRole(twinBag, "oracle", "juggler", SNV_ALL, fixed)?.evilTwinGoodId, "sage");
  assert.equal(swapBagRole(twinBag, "eviltwin", "witch", SNV_ALL, fixed)?.evilTwinGoodId, null);
});
