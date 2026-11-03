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
