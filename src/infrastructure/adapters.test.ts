import test from "node:test";
import assert from "node:assert/strict";
import { createLocalGameStorage } from "./storage/local-game-storage.ts";
import { createLocalPreferences } from "./preferences/local-preferences.ts";
import { createSystemPorts } from "./platform/system-ports.ts";

function fakeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get length() {
      return values.size;
    },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

test("the storage adapter reads, writes and removes the game key", () => {
  const store = fakeStorage();
  const adapter = createLocalGameStorage(store);
  assert.equal(adapter.readRaw(), null);
  adapter.write('{"v":4}');
  assert.equal(adapter.readRaw(), '{"v":4}');
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

test("reopening identical damaged bytes reuses their backup even when storage is full", (t) => {
  const disk = fakeStorage();
  const now = t.mock.method(Date, "now", () => 123);
  const first = createLocalGameStorage(disk).backup("{first");
  assert.ok(first);
  now.mock.mockImplementation(() => 456);
  t.mock.method(disk, "setItem", () => {
    throw new Error("quota");
  });
  assert.equal(createLocalGameStorage(disk).backup("{first"), first);
  assert.equal(disk.length, 1);
});

test("two distinct damaged saves from the same millisecond each retain their original bytes", (t) => {
  t.mock.method(Date, "now", () => 123);
  const disk = fakeStorage();
  const first = createLocalGameStorage(disk).backup("{first");
  const second = createLocalGameStorage(disk).backup("{second");
  assert.ok(first && second);
  assert.notEqual(first, second);
  assert.equal(disk.getItem(first), "{first");
  assert.equal(disk.getItem(second), "{second");
});

test("overlapping backup writes in separate windows keep both originals", (t) => {
  t.mock.method(Date, "now", () => 456);
  const disk = fakeStorage();
  const firstWindow = createLocalGameStorage(disk);
  const secondWindow = createLocalGameStorage(disk);
  const write = disk.setItem;
  let secondKey: string | null = null;
  disk.setItem = (key, text) => {
    // The second window writes after the first selected a key and before its write.
    if (text === "first") secondKey = secondWindow.backup("second");
    write(key, text);
  };
  const firstKey = firstWindow.backup("first");
  assert.ok(firstKey && secondKey);
  assert.notEqual(firstKey, secondKey);
  assert.equal(disk.getItem(firstKey), "first");
  assert.equal(disk.getItem(secondKey), "second");
});

test("the storage adapter reports a legacy key once", () => {
  const store = fakeStorage({ "pg.game.v3": '{"v":3}' });
  const adapter = createLocalGameStorage(store);
  assert.deepEqual(adapter.readFallback?.(), { key: "pg.game.v3", value: '{"v":3}' });
  assert.equal(createLocalGameStorage(fakeStorage()).readFallback?.(), null);
});

test("the storage adapter does not require a window", () => {
  assert.equal(typeof window, "undefined");
  const adapter = createLocalGameStorage(fakeStorage());
  assert.equal(typeof adapter.watch(() => {}), "function");
});

test("the preference adapter tolerates an unavailable store", () => {
  const adapter = createLocalPreferences({
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
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

test("denying access to the localStorage getter still permits store initialization and preferences", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("Storage access is denied", "SecurityError");
    },
  });
  try {
    const { createGameStore } = await import("../application/store/create-game-store.ts");
    const preferences = createLocalPreferences();
    const game = createGameStore({
      ...createSystemPorts(),
      storage: createLocalGameStorage(),
      preferences,
    });
    assert.equal(game.state.phase, "setup");
    assert.equal(game.loadStatus.ok, false);
    assert.doesNotThrow(() => preferences.set("pg.lang", "en"));
    assert.equal(preferences.get("pg.lang"), null);
    assert.equal(game.persist().ok, false);
    assert.equal(game.getSnapshot().save.status, "failed");
    game.dispose();
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
