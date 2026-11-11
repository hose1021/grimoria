import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_ROLES,
  BMR_ALL,
  COMPOSITION,
  SNV_ALL,
  bagErrors,
  compositionFor,
  requiredBluffs,
  roleTeam,
} from "./rules.js";
import { presetBag } from "./presets.js";
import { createGame, publicGameView } from "./model.js";
import { dealGame, setupErrors } from "./engine.js";
import { parseScript } from "./scripts.js";

// Setup table: every supported player count, every scenario modifier, the
// Drunk and Lunatic masks, and the script limits. The sources are the pinned
// wiki revisions named in openspec/specs/game/setup/spec.md.

const COUNTS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const POOLS = { tb: ALL_ROLES, bmr: BMR_ALL, snv: SNV_ALL };
const CATALOG = [...new Set([...ALL_ROLES, ...BMR_ALL, ...SNV_ALL])].map((id) => ({
  id,
  name: id,
  team: roleTeam(id),
  edition: "custom",
}));

function preset(scriptId, count, variant = 0) {
  const bag = presetBag(scriptId, count, variant);
  assert.ok(bag, `${scriptId} ${count}/${variant} has no preset`);
  return bag;
}

function codes(errors) {
  return errors.map((error) => error.code);
}

function dealPreset(scriptId, count, variant = 0) {
  const bag = preset(scriptId, count, variant);
  const state = createGame(count);
  state.script = {
    id: scriptId,
    name: scriptId,
    edition: scriptId,
    source: "official",
    roles: POOLS[scriptId].slice(),
  };
  state.scriptId = scriptId;
  state.setup.count = count;
  state.setup.roles = bag.roles.slice();
  state.setup.bluffs = bag.bluffs.slice();
  state.setup.drunkShownId = bag.drunkShownId;
  state.setup.lunaticShownId = bag.lunaticShownId;
  state.setup.evilTwinGoodId = bag.evilTwinGoodId;
  const assignment = {};
  state.order.forEach((id, index) => {
    assignment[id] = bag.roles[index];
    state.players[id].name = "P" + id;
  });
  assert.deepEqual(setupErrors(state), [], `${scriptId} ${count}/${variant}`);
  const result = dealGame(state, { assignment });
  assert.equal(result.ok, true, JSON.stringify(result));
  return { state, bag };
}

test("every player count from 5 to 15 has a legal bag in every official scenario", () => {
  for (const scriptId of ["tb", "bmr", "snv"]) {
    for (const count of COUNTS) {
      for (let variant = 0; variant < 3; variant += 1) {
        const bag = preset(scriptId, count, variant);
        assert.deepEqual(bag.errors, [], `${scriptId} ${count}/${variant}`);
        assert.equal(bag.roles.length, count);
        assert.equal(new Set(bag.roles).size, count);
        assert.equal(bag.bluffs.length, requiredBluffs(count));
        const got = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
        for (const id of bag.roles) got[roleTeam(id)] += 1;
        assert.deepEqual(got, compositionFor(count, bag.roles), `${scriptId} ${count}/${variant}`);
      }
    }
  }
});

test("the official composition table covers 5 to 15 players exactly", () => {
  for (const count of COUNTS) {
    const rows = COMPOSITION[count];
    assert.ok(rows, "missing composition row " + count);
    assert.equal(
      rows.reduce((sum, value) => sum + value, 0),
      count,
      "composition " + count,
    );
    assert.equal(rows[3], 1, "one Demon at " + count);
    assert.deepEqual(compositionFor(count), {
      townsfolk: rows[0],
      outsider: rows[1],
      minion: rows[2],
      demon: rows[3],
    });
  }
});

test("each setup modifier shifts the composition like its official source", () => {
  const cases = [
    {
      role: "baron",
      count: 5,
      expected: { townsfolk: 1, outsider: 2, minion: 1, demon: 1 },
    },
    {
      role: "godfather",
      count: 8,
      expected: { townsfolk: 4, outsider: 2, minion: 1, demon: 1 },
    },
    {
      role: "fanggu",
      count: 8,
      expected: { townsfolk: 4, outsider: 2, minion: 1, demon: 1 },
    },
    {
      role: "vigormortis",
      count: 8,
      expected: { townsfolk: 6, outsider: 0, minion: 1, demon: 1 },
    },
  ];
  for (const { role, count, expected } of cases) {
    assert.deepEqual(compositionFor(count, [role]), expected, role + " at " + count);
    const total = Object.values(expected).reduce((sum, value) => sum + value, 0);
    assert.equal(total, count, role + " keeps the player count");
  }
  assert.deepEqual(compositionFor(8, ["godfather"], -1), {
    townsfolk: 6,
    outsider: 0,
    minion: 1,
    demon: 1,
  });
});

test("an impossible modifier choice is rejected with its reason", () => {
  const bmr = preset("bmr", 7, 2);
  assert.ok(bmr.roles.includes("godfather"));
  assert.equal(COMPOSITION[7][1], 0);
  const godfather = bagErrors({
    count: 7,
    roles: bmr.roles,
    bluffs: bmr.bluffs,
    drunkShownId: bmr.drunkShownId,
    lunaticShownId: bmr.lunaticShownId,
    pool: BMR_ALL,
    godfatherOutsider: -1,
  });
  assert.ok(codes(godfather).includes("godfather-minus"), JSON.stringify(godfather));

  const vigormortis = bagErrors({
    count: 7,
    roles: ["vigormortis", "cerenovus", "artist", "clockmaker", "dreamer", "flowergirl", "sage"],
    bluffs: [],
    pool: SNV_ALL,
  });
  assert.ok(codes(vigormortis).includes("vigormortis-minus"), JSON.stringify(vigormortis));
});

test("illegal bags are rejected with a stable reason", () => {
  const tb7 = preset("tb", 7, 2);
  const tb8 = preset("tb", 8, 2);
  assert.ok(tb8.roles.includes("drunk"));
  const base = { count: 7, roles: tb7.roles, bluffs: tb7.bluffs, pool: ALL_ROLES };
  const check = (overrides, code) => {
    const errors = bagErrors({ ...base, ...overrides });
    assert.ok(codes(errors).includes(code), `${code}: ${JSON.stringify(codes(errors))}`);
  };

  check({ count: 4 }, "count");
  check({ count: 16 }, "count");
  check({ roles: tb7.roles.slice(0, -1) }, "size");
  check({ roles: [tb7.roles[0], tb7.roles[0], ...tb7.roles.slice(2)] }, "duplicate");
  check({ roles: [...tb7.roles.slice(0, -1), "vanggu"] }, "unknown");
  check({ roles: [...tb7.roles.slice(0, -1), "godfather"] }, "outside-script");
  check(
    {
      count: 5,
      roles: ["chef", "empath", "monk", "poisoner", "imp"],
      bluffs: ["mayor"],
      pool: ALL_ROLES,
    },
    "bluffs-count",
  );
  check({ bluffs: ["mayor", "mayor", "virgin"] }, "bluffs-duplicate");
  check({ bluffs: ["imp", "mayor", "virgin"] }, "bluffs-team");
  check({ bluffs: [tb7.roles[0], "mayor", "virgin"] }, "bluffs-inplay");

  const drunkBase = {
    count: 8,
    roles: tb8.roles,
    bluffs: tb8.bluffs,
    pool: ALL_ROLES,
  };
  const drunkCheck = (overrides, code) => {
    const errors = bagErrors({ ...drunkBase, ...overrides });
    assert.ok(codes(errors).includes(code), `${code}: ${JSON.stringify(codes(errors))}`);
  };
  drunkCheck({ drunkShownId: null }, "drunk-shown");
  drunkCheck({ drunkShownId: "butler" }, "drunk-team");
  drunkCheck({ drunkShownId: "chef" }, "drunk-inplay");
  drunkCheck(
    { drunkShownId: tb8.drunkShownId, bluffs: [tb8.drunkShownId, "mayor", "virgin"] },
    "bluffs-drunk",
  );

  const bmr7 = preset("bmr", 7, 2);
  assert.ok(bmr7.roles.includes("lunatic"));
  const lunaticBase = {
    count: 7,
    roles: bmr7.roles,
    bluffs: bmr7.bluffs,
    drunkShownId: bmr7.drunkShownId,
    pool: BMR_ALL,
  };
  const lunaticCheck = (overrides, code) => {
    const errors = bagErrors({ ...lunaticBase, ...overrides });
    assert.ok(codes(errors).includes(code), `${code}: ${JSON.stringify(codes(errors))}`);
  };
  lunaticCheck({ lunaticShownId: null }, "lunatic-shown");
  lunaticCheck({ lunaticShownId: "chambermaid" }, "lunatic-team");
  lunaticCheck(
    { lunaticShownId: "zombuul", pool: BMR_ALL.filter((id) => id !== "zombuul") },
    "lunatic-outside-script",
  );
  assert.ok(
    codes(
      bagErrors({
        count: 7,
        roles: tb7.roles,
        bluffs: tb7.bluffs,
        lunaticShownId: "imp",
        pool: ALL_ROLES,
      }),
    ).includes("lunatic-unused"),
  );
});

test("the Drunk and Lunatic masks never become bluffs or public information", () => {
  const tb = preset("tb", 8, 2);
  assert.equal(roleTeam(tb.drunkShownId), "townsfolk");
  const drunkBluff = bagErrors({
    count: 8,
    roles: tb.roles,
    bluffs: [tb.drunkShownId, ...tb.bluffs.slice(1)],
    drunkShownId: tb.drunkShownId,
    pool: ALL_ROLES,
  });
  assert.ok(codes(drunkBluff).includes("bluffs-drunk"));

  const bmr = preset("bmr", 7, 2);
  assert.equal(roleTeam(bmr.lunaticShownId), "demon");
  const lunaticBluff = bagErrors({
    count: 7,
    roles: bmr.roles,
    bluffs: [bmr.lunaticShownId, ...bmr.bluffs.slice(1)],
    lunaticShownId: bmr.lunaticShownId,
    pool: BMR_ALL,
  });
  assert.ok(codes(lunaticBluff).includes("bluffs-lunatic"), JSON.stringify(lunaticBluff));

  const drunkGame = dealPreset("tb", 8, 2);
  const drunk = drunkGame.state.order.find((id) => drunkGame.state.players[id].roleId === "drunk");
  assert.ok(drunk);
  assert.equal(drunkGame.state.players[drunk].shownRoleId, drunkGame.bag.drunkShownId);
  assert.notEqual(drunkGame.state.players[drunk].roleId, drunkGame.bag.drunkShownId);
  const drunkPublic = JSON.stringify(publicGameView(drunkGame.state));
  assert.equal(drunkPublic.includes("drunk"), false);
  assert.equal(drunkPublic.includes(drunkGame.bag.drunkShownId), false);

  const lunaticGame = dealPreset("bmr", 7, 2);
  const lunatic = lunaticGame.state.order.find(
    (id) => lunaticGame.state.players[id].roleId === "lunatic",
  );
  assert.ok(lunatic);
  assert.equal(lunaticGame.state.players[lunatic].shownRoleId, lunaticGame.bag.lunaticShownId);
  const lunaticPublic = JSON.stringify(publicGameView(lunaticGame.state));
  assert.equal(lunaticPublic.includes("lunatic"), false);
  assert.equal(lunaticPublic.includes(lunaticGame.bag.lunaticShownId), false);
  assert.equal(lunaticPublic.includes('"bluffs"'), false);
});

test("script limits reject mixed editions, unknown roles and short rosters", () => {
  const mixed = parseScript(
    JSON.stringify(["chef", "empath", "imp", "poisoner", "godfather"]),
    CATALOG,
  );
  assert.equal(mixed.ok, false);
  assert.match(mixed.error, /Смешивать/);

  const unknown = parseScript(
    JSON.stringify(["chef", "empath", "imp", "poisoner", "vanggu"]),
    CATALOG,
  );
  assert.equal(unknown.ok, false);
  assert.match(unknown.error, /vanggu/);

  const short = parseScript(JSON.stringify(["chef", "empath", "imp"]), CATALOG);
  assert.equal(short.ok, false);
  assert.match(short.error, /пяти/);

  const sameEdition = parseScript(JSON.stringify(ALL_ROLES), CATALOG);
  assert.equal(sameEdition.ok, true, JSON.stringify(sameEdition));
  const outside = bagErrors({
    count: 5,
    roles: ["chef", "empath", "monk", "poisoner", "imp"],
    bluffs: [],
    pool: ["chef", "empath", "imp", "poisoner", "soldier"],
  });
  assert.ok(codes(outside).includes("outside-script"), JSON.stringify(outside));

  const manual = createGame(5);
  manual.script = {
    id: "custom-mixed",
    name: "Mixed",
    edition: "custom",
    source: "manual",
    roles: ["fortuneteller", "chambermaid", "monk", "poisoner", "imp"],
    manualOnly: false,
  };
  manual.scriptId = manual.script.id;
  manual.setup.roles = manual.script.roles.slice();
  assert.ok(
    codes(setupErrors(manual)).includes("mixed-edition"),
    JSON.stringify(setupErrors(manual)),
  );
});
