import test from "node:test";
import assert from "node:assert/strict";
import { ALL_ROLES, bagErrors, randomBag, roleTeam } from "./rules.js";
import {
  SCHEMA_VERSION, createGame, exportGame, importGame, migrateV3, validateState
} from "./model.js";
import { dealGame, setupErrors, startNight } from "./engine.js";
import {
  OFFICIAL_SCRIPTS, isSupportedRole, parseScript, troubleBrewingScript
} from "./scripts.js";

const CATALOG = ALL_ROLES.map((id) => ({ id, name: id, team: roleTeam(id), edition: "tb" }));
CATALOG.push({ id: "po", name: "Po", team: "demon", edition: "bmr" });
CATALOG.push({ id: "clockmaker", name: "Clockmaker", team: "townsfolk", edition: "snv" });
CATALOG.push({ id: "kazali", name: "Kazali", team: "demon", edition: "carousel" });
CATALOG.push({ id: "scapegoat", name: "Scapegoat", team: "traveller", edition: "tb" });

const SCRIPT_ROLES = [
  "chef", "empath", "undertaker", "monk", "slayer",
  "soldier", "ravenkeeper", "mayor",
  "poisoner", "imp"
];
const SEVEN = ["chef", "empath", "undertaker", "monk", "slayer", "poisoner", "imp"];
const BLUFFS = ["soldier", "ravenkeeper", "mayor"];

function customScript(roles = SCRIPT_ROLES) {
  return {
    id: "custom-test",
    name: "Test Script",
    edition: "custom",
    source: "file",
    roles: roles.slice()
  };
}

test("official scripts mark all three core scenarios as supported", () => {
  assert.deepEqual(OFFICIAL_SCRIPTS.map((entry) => entry.id), ["tb", "bmr", "snv"]);
  for (const id of ["tb", "bmr", "snv"]) {
    assert.equal(OFFICIAL_SCRIPTS.find((entry) => entry.id === id).supported, true);
  }
  assert.equal(OFFICIAL_SCRIPTS.find((entry) => entry.id === "snv").roleCount, 25);
});

test("the built-in Trouble Brewing script covers the full playable roster", () => {
  const script = troubleBrewingScript();
  assert.equal(script.id, "tb");
  assert.equal(script.edition, "tb");
  assert.deepEqual(script.roles, ALL_ROLES);
  script.roles.pop();
  assert.equal(troubleBrewingScript().roles.length, ALL_ROLES.length);
});

test("parses the official script tool JSON and keeps its meta name and author", () => {
  const text = JSON.stringify([
    { id: "_meta", name: "Test Script", author: "Tester" },
    ...ALL_ROLES.map((id) => ({ id }))
  ]);
  const result = parseScript(text, CATALOG, "url");
  assert.equal(result.ok, true, result.error);
  assert.equal(result.script.name, "Test Script");
  assert.equal(result.script.author, "Tester");
  assert.equal(result.script.source, "url");
  assert.deepEqual(result.script.roles, ALL_ROLES);
  assert.match(result.script.id, /^custom-/);
});

test("accepts plain role ids and object scripts", () => {
  const text = JSON.stringify(ALL_ROLES);
  const plain = parseScript(text, CATALOG, "clipboard");
  assert.equal(plain.ok, true, plain.error);
  assert.deepEqual(plain.script.roles, ALL_ROLES);
  const object = parseScript(JSON.stringify({
    _meta: { name: "Object Script" },
    roles: ALL_ROLES.map((id) => ({ id }))
  }), CATALOG, "text");
  assert.equal(object.ok, true, object.error);
  assert.equal(object.script.name, "Object Script");
});

test("rejects unknown, unsupported and traveller-only additions with a clear message", () => {
  const unknown = parseScript(JSON.stringify([{ id: "_meta", name: "X" }, ...SEVEN.map((id) => ({ id })), { id: "notarole" }]), CATALOG);
  assert.equal(unknown.ok, false);
  assert.match(unknown.error, /notarole/);

  const foreign = parseScript(JSON.stringify([...SEVEN.map((id) => ({ id })), { id: "kazali" }]), CATALOG);
  assert.equal(foreign.ok, false);
  assert.match(foreign.error, /Kazali/);
  assert.match(foreign.error, /Sects and Violets/);

  const mixed = parseScript(JSON.stringify([...SEVEN.map((id) => ({ id })), { id: "po" }]), CATALOG);
  assert.equal(mixed.ok, false);
  assert.match(mixed.error, /Смешивать/);

  const travellersOnly = parseScript(JSON.stringify([...SEVEN.map((id) => ({ id })), { id: "scapegoat" }]), CATALOG);
  assert.equal(travellersOnly.ok, true, travellersOnly.error);
  assert.deepEqual(travellersOnly.travellers, ["scapegoat"]);
  assert.deepEqual(travellersOnly.script.roles, SEVEN);
});

test("rejects scripts that are too small or miss a required team", () => {
  const small = parseScript(JSON.stringify(["chef", "empath", "poisoner", "imp"]), CATALOG);
  assert.equal(small.ok, false);
  assert.match(small.error, /пяти/);

  const noDemon = parseScript(JSON.stringify(["chef", "empath", "undertaker", "monk", "poisoner"]), CATALOG);
  assert.equal(noDemon.ok, false);
  assert.match(noDemon.error, /Демон/);

  const noMinion = parseScript(JSON.stringify(["chef", "empath", "undertaker", "monk", "imp"]), CATALOG);
  assert.equal(noMinion.ok, false);
  assert.match(noMinion.error, /Приспешник/);
});

test("the same script text produces a stable custom id", () => {
  const text = JSON.stringify([{ id: "_meta", name: "Stable" }, ...SEVEN.map((id) => ({ id }))]);
  const first = parseScript(text, CATALOG);
  const second = parseScript(text, CATALOG);
  assert.equal(first.script.id, second.script.id);
  const renamed = parseScript(JSON.stringify([{ id: "_meta", name: "Renamed" }, ...SEVEN.map((id) => ({ id }))]), CATALOG);
  assert.notEqual(first.script.id, renamed.script.id);
});

test("random bags and validation stay inside a custom script pool", () => {
  const bag = randomBag(7, Math.random, SCRIPT_ROLES);
  assert.equal(bag.roles.length, 7);
  assert.ok(bag.roles.every((id) => SCRIPT_ROLES.includes(id)));
  assert.equal(bag.bluffs.length, 3);
  assert.ok(bag.bluffs.every((id) => SCRIPT_ROLES.includes(id) && !bag.roles.includes(id)));
  assert.deepEqual(bagErrors({
    count: 7, roles: bag.roles, bluffs: bag.bluffs, drunkShownId: bag.drunkShownId, pool: SCRIPT_ROLES
  }), []);
  assert.throws(() => randomBag(8, Math.random, SCRIPT_ROLES), /не хватает ролей/);

  const outside = bagErrors({ count: 7, roles: SEVEN, bluffs: BLUFFS, pool: ALL_ROLES.filter((id) => !SEVEN.includes(id)) });
  assert.ok(outside.some((error) => error.code === "outside-script"));
});

test("a custom Trouble Brewing script deals and starts a night", () => {
  const state = createGame(7);
  state.script = customScript();
  state.scriptId = state.script.id;
  state.setup.roles = SEVEN.slice();
  state.setup.bluffs = BLUFFS.slice();
  assert.deepEqual(setupErrors(state), []);
  assert.deepEqual(validateState(state), []);

  const assignment = {};
  state.order.forEach((id, index) => { assignment[id] = SEVEN[index]; });
  assert.equal(dealGame(state, { assignment }).ok, true);
  const night = startNight(state);
  assert.equal(night.ok, true, JSON.stringify(night));
  assert.deepEqual(state.night.queue.map((step) => step.roleId || step.system),
    ["minioninfo", "demoninfo", "poisoner", "chef", "empath"]);
  assert.equal(importGame(exportGame(state)).ok, true);
});

test("state validation rejects roles outside the selected script", () => {
  const state = createGame(7);
  state.script = customScript();
  state.scriptId = state.script.id;
  state.players["1"].roleId = "chef";
  state.players["1"].shownRoleId = "chef";
  assert.deepEqual(validateState(state), []);
  state.script.roles = state.script.roles.filter((id) => id !== "chef");
  assert.ok(validateState(state).some((error) => /Invalid role/.test(error)));

  const foreign = createGame(7);
  foreign.script = customScript([...SCRIPT_ROLES, "kazali"]);
  foreign.scriptId = foreign.script.id;
  assert.ok(validateState(foreign).some((error) => /Unsupported script role/.test(error)));
});

test("v3 saves gain the Trouble Brewing script on migration", () => {
  const legacy = createGame(7);
  legacy.v = 3;
  legacy.scriptId = "tb";
  delete legacy.script;
  assert.equal(validateState(legacy).length > 0, true);
  const migrated = migrateV3(legacy);
  assert.equal(migrated.v, SCHEMA_VERSION);
  assert.equal(migrated.script.id, "tb");
  assert.deepEqual(migrated.script.roles, ALL_ROLES);
  assert.deepEqual(validateState(migrated), []);
});

test("Trouble Brewing, Bad Moon Rising and Sects and Violets role ids are playable", () => {
  assert.equal(isSupportedRole("chef"), true);
  assert.equal(isSupportedRole("po"), true);
  assert.equal(isSupportedRole("clockmaker"), true);
  assert.equal(isSupportedRole("kazali"), false);
  assert.equal(isSupportedRole("scapegoat"), false);
});
