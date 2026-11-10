import test from "node:test";
import assert from "node:assert/strict";
import { createLocalGameStorage } from "./storage/local-game-storage.ts";
import { createLocalPreferences } from "./preferences/local-preferences.ts";
import { createSystemPorts } from "./platform/system-ports.ts";
import { createWebLocksCoordination } from "./coordination/web-locks.ts";

function fakeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
}

test("the storage adapter reads, writes and removes the game key", () => {
  const store = fakeStorage();
  const adapter = createLocalGameStorage(store);
  assert.equal(adapter.readRaw(), null);
  adapter.write("{\"v\":4}");
  assert.equal(adapter.readRaw(), "{\"v\":4}");
  assert.deepEqual(adapter.read(), { v: 4 });
  adapter.remove();
  assert.equal(adapter.readRaw(), null);
});

test("the storage adapter backs up a corrupt value under a timestamped key", () => {
  const store = fakeStorage();
  const adapter = createLocalGameStorage(store);
  const key = adapter.backup("{broken");
  assert.ok(key);
  assert.match(key as string, /^pg\.game\.broken\.\d+$/);
  assert.equal(store.getItem(key as string), "{broken");
});

test("the storage adapter reports a legacy key once", () => {
  const store = fakeStorage({ "pg.game.v3": "{\"v\":3}" });
  const adapter = createLocalGameStorage(store);
  assert.deepEqual(adapter.readFallback?.(), { key: "pg.game.v3", value: "{\"v\":3}" });
  assert.equal(createLocalGameStorage(fakeStorage()).readFallback?.(), null);
});

test("the storage adapter does not require a window", () => {
  assert.equal(typeof window, "undefined");
  const adapter = createLocalGameStorage(fakeStorage());
  assert.equal(typeof adapter.watch(() => {}), "function");
});

test("the preference adapter tolerates an unavailable store", () => {
  const adapter = createLocalPreferences({
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); }
  });
  assert.equal(adapter.get("pg.lang"), null);
  assert.doesNotThrow(() => adapter.set("pg.lang", "en"));
});

test("the preference adapter reads and writes one key", () => {
  const store = fakeStorage();
  const adapter = createLocalPreferences(store);
  adapter.set("pg.guided", "true");
  assert.equal(adapter.get("pg.guided"), "true");
});

test("platform ports provide a clock, unique ids and a stable seed", () => {
  const ports = createSystemPorts();
  assert.equal(typeof ports.clock.now().toISOString(), "string");
  assert.notEqual(ports.ids.next(), ports.ids.next());
  assert.equal(ports.random.seed("same"), ports.random.seed("same"));
  assert.notEqual(ports.random.seed("same"), ports.random.seed("other"));
});

test("coordination grants the writer without the Web Locks API", async () => {
  const adapter = createWebLocksCoordination();
  assert.equal(await adapter.acquireWriter(), true);
  assert.doesNotThrow(() => adapter.release());
});
