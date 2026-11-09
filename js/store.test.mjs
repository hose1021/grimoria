import test from "node:test";
import assert from "node:assert/strict";
import { createGame, validateState, importGame, STORAGE_KEY } from "./model.js";

let instance = 0;
async function store(initial) {
  const values = new Map(initial ? [[STORAGE_KEY, JSON.stringify(initial)]] : []);
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => values.delete(key)
  };
  return { module: await import(`./store.js?test=${++instance}`), values };
}

test("claimed names survive save, reload and legacy migration", async () => {
  const game = createGame(7);
  game.players["1"].name = "Alice";
  game.players["1"].claimed = true;
  const loaded = await store(game);
  assert.equal(loaded.module.state.players["1"].name, "Alice");
  loaded.module.save();
  const reloaded = await store(JSON.parse(loaded.values.get(STORAGE_KEY)));
  assert.equal(reloaded.module.state.players["1"].claimed, true);
  assert.equal(reloaded.module.state.players["1"].name, "Alice");
  const legacy = { ...game, v: 2, night: 1 };
  const migrated = await store(legacy);
  assert.equal(migrated.module.state.players["1"].name, "Alice");
  assert.equal(migrated.module.state.players["1"].claimed, true);
});

test("rejected and throwing actions roll back all mutations without creating undo entries", async () => {
  const { module: s } = await store();
  const before = JSON.stringify(s.state);
  assert.equal(s.run((game) => { game.players["1"].alive = false; return { ok: false }; }).ok, false);
  assert.equal(JSON.stringify(s.state), before);
  assert.equal(s.canUndo(), false);
  assert.equal(s.run((game) => { game.effects.push({}); throw new Error("failed"); }).ok, false);
  assert.equal(JSON.stringify(s.state), before);
  assert.equal(s.canUndo(), false);
});

test("malformed imports leave the existing game and disk unchanged", async () => {
  const { module: s, values } = await store(createGame(7));
  const before = JSON.stringify(s.state);
  const disk = values.get(STORAGE_KEY);
  for (const mutate of [
    (g) => { g.players["1"] = null; },
    (g) => { g.night = null; },
    (g) => { g.day.morning = [null]; },
    (g) => { g.order[0] = "missing"; },
    (g) => { g.effects = [{ sourceId: "unknown", targetId: "1", active: true }]; },
    (g) => { g.setup.info.washerwoman = { pair: ["unknown"] }; }
  ]) {
    const invalid = createGame(7);
    mutate(invalid);
    assert.doesNotThrow(() => validateState(invalid));
    assert.equal(s.importGame(JSON.stringify(invalid)).ok, false);
    assert.equal(JSON.stringify(s.state), before);
    assert.equal(values.get(STORAGE_KEY), disk);
  }
  assert.equal(importGame("null").ok, false);
  assert.equal(importGame({ v: 2, order: ["1", "2", "3", "4", "5"], nightOrder: [null] }).ok, false);
});

test("storage failure reports an applied memory-only action and retains undo", async () => {
  const { module: s } = await store();
  localStorage.setItem = () => { throw new Error("quota"); };
  const result = s.run((game) => { game.notes = "Keep this"; return { ok: true }; });
  assert.equal(result.ok, true);
  assert.equal(result.persisted, false);
  assert.equal(s.state.notes, "Keep this");
  assert.match(s.state.storageError, /quota/);
  assert.equal(s.canUndo(), true);
});

test("a stale tab cannot overwrite a newer disk revision", async () => {
  const { module: s, values } = await store(createGame(7));
  const newer = { ...createGame(7), revision: 10, notes: "newer" };
  values.set(STORAGE_KEY, JSON.stringify(newer));
  assert.equal(s.save(), false);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)).notes, "newer");
});

test("saveIfNeeded leaves an already persisted game untouched and writes pending changes", async () => {
  const game = createGame(7);
  game.players["1"].name = "Alice";
  const { module: s, values } = await store(game);
  const disk = values.get(STORAGE_KEY);
  const revision = Number(s.state.revision) || 0;
  assert.equal(s.saveIfNeeded(), true);
  assert.equal(values.get(STORAGE_KEY), disk);
  assert.equal(Number(s.state.revision) || 0, revision);
  s.state.notes = "Saved before updating";
  assert.equal(s.saveIfNeeded(), true);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)).notes, "Saved before updating");
  assert.equal(s.state.revision, revision + 1);
});

test("a corrupt save is backed up and can be replaced by a valid game", async () => {
  const corrupt = { v: 3, revision: 9, players: null };
  const { module: s, values } = await store(corrupt);
  assert.equal(s.loadStatus.ok, false);
  assert.equal(values.get(s.loadStatus.backupKey), JSON.stringify(corrupt));
  s.reset(7);
  assert.equal(validateState(JSON.parse(values.get(STORAGE_KEY))).length, 0);
});

test("a v3 save migrates to v4 with the Trouble Brewing script", async () => {
  const v3 = createGame(7);
  v3.v = 3;
  v3.scriptId = "tb";
  delete v3.script;
  const values = new Map([["pg.game.v3", JSON.stringify(v3)]]);
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => values.delete(key)
  };
  const module = await import(`./store.js?test=${++instance}`);
  assert.equal(module.state.v, 4);
  assert.equal(module.state.script.id, "tb");
  assert.equal(module.state.script.roles.length, 22);
  assert.ok(values.get("pg.game.v4"));
});

test("a custom script survives save and reload", async () => {
  const game = createGame(7);
  game.script = {
    id: "custom-test",
    name: "Test Script",
    edition: "custom",
    source: "file",
    roles: ["chef", "empath", "undertaker", "monk", "slayer", "soldier", "ravenkeeper", "mayor", "poisoner", "imp"]
  };
  game.scriptId = game.script.id;
  game.setup.roles = ["chef", "empath", "undertaker", "monk", "slayer", "poisoner", "imp"];
  game.setup.bluffs = ["soldier", "ravenkeeper", "mayor"];
  const loaded = await store(game);
  loaded.module.save();
  const reloaded = await store(JSON.parse(loaded.values.get(STORAGE_KEY)));
  assert.equal(reloaded.module.state.script.id, "custom-test");
  assert.equal(reloaded.module.state.script.name, "Test Script");
  assert.deepEqual(reloaded.module.state.setup.roles, game.setup.roles);
});

test("dispatch applies once, saves, and undo restores the previous state", async () => {
  const { module: s } = await store();
  const command = {
    id: "dispatch-1",
    type: "manualCorrection",
    payload: { change: { kind: "alive", playerId: "1", value: false, reason: "test" } }
  };
  const first = s.dispatch(command);
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(first.persisted, true);
  assert.equal(s.state.players["1"].alive, false);
  assert.equal(s.canUndo(), true);

  const second = s.dispatch(command);
  assert.equal(second.status, "allowed");
  assert.equal(second.idempotent, true);
  assert.equal(s.state.players["1"].alive, false);

  s.undo();
  assert.equal(s.state.players["1"].alive, true);
});
