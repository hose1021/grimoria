import test from "node:test";
import assert from "node:assert/strict";
import {
  LIBRARY_KEY,
  editLibrary,
  emptyLibrary,
  exportLibrary,
  normalizeLibrary,
  parseLibrary,
  readLibrary,
  removeBag,
  removePool,
  upsertBag,
  upsertPool,
  writeLibrary,
} from "./bag-library.ts";
import { STORAGE_KEY } from "../../core/model/state.ts";

test("a host can restore a damaged library only after preserving the exact bytes they saw", async () => {
  const values = fakeStorage();
  const original = '{"bags":';
  values.set(LIBRARY_KEY, original);
  const broken = readLibrary();
  assert.equal(broken.ok, false);
  const replacement = normalizeLibrary({ bags: [bag] });
  const restore = { type: "replace", library: replacement } as const;
  assert.equal((await editLibrary(broken.library, { type: "saveBag", entry: bag })).ok, false);
  assert.equal((await editLibrary(emptyLibrary(), restore)).ok, false);
  values.set(LIBRARY_KEY, "{different broken bytes");
  assert.equal((await editLibrary(broken.library, restore)).ok, false);
  values.set(LIBRARY_KEY, JSON.stringify(emptyLibrary()));
  assert.equal((await editLibrary(broken.library, restore)).ok, false);
  values.set(LIBRARY_KEY, original);
  const setItem = localStorage.setItem;
  localStorage.setItem = (key, value) => {
    if (key.startsWith(LIBRARY_KEY + ".broken."))
      throw new DOMException("Full", "QuotaExceededError");
    setItem(key, value);
  };
  assert.equal((await editLibrary(broken.library, restore)).ok, false);
  assert.equal(values.get(LIBRARY_KEY), original);
  localStorage.setItem = (key, value) => {
    if (key === LIBRARY_KEY) throw new DOMException("Full", "QuotaExceededError");
    setItem(key, value);
  };
  assert.equal((await editLibrary(broken.library, restore)).ok, false);
  assert.equal(values.get(LIBRARY_KEY), original);
  localStorage.setItem = setItem;
  assert.equal((await editLibrary(broken.library, restore)).ok, true);
  assert.deepEqual(readLibrary().library, replacement);
  assert.equal(
    [...values].filter(([key, raw]) => key.startsWith(LIBRARY_KEY + ".broken.") && raw === original)
      .length,
    1,
  );
});

test("a cancelled library restore cannot replace entries after it acquires the writer lock", async (t) => {
  const values = fakeStorage();
  const saved = normalizeLibrary({ bags: [bag] });
  writeLibrary(saved);
  const before = values.get(LIBRARY_KEY);
  const blocker = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  const locks = {
    async request(_name: string, task: () => unknown) {
      started.resolve();
      await blocker.promise;
      return task();
    },
  };
  t.mock.getter(Object.getPrototypeOf(navigator), "locks", () => locks);
  const controller = new AbortController();
  const pending = editLibrary(readLibrary().library, {
    type: "replace",
    library: emptyLibrary(),
    signal: controller.signal,
  });
  await started.promise;
  controller.abort();
  blocker.resolve();
  assert.equal((await pending).ok, false);
  assert.equal(values.get(LIBRARY_KEY), before);
});

function fakeStorage(): Map<string, string> {
  const values = new Map<string, string>();
  globalThis.localStorage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  return values;
}

const bag = {
  name: "Test bag",
  scriptId: "tb",
  roles: ["chef", "empath", "monk", "poisoner", "imp"],
  bluffs: [],
};

test("saved bags round-trip the Lunatic mask mode and independent bluffs", () => {
  for (const lunaticShownExplicit of [false, true]) {
    const saved = upsertBag(emptyLibrary(), {
      ...bag,
      lunaticShownId: "po",
      lunaticShownExplicit,
      lunaticBluffs: ["chef", "empath", "monk"],
    });
    assert.equal(saved.ok, true);
    if (!saved.ok) continue;
    const restored = parseLibrary(exportLibrary(saved.library));
    assert.equal(restored.ok, true);
    if (!restored.ok) continue;
    assert.equal(restored.library.bags[0].lunaticShownExplicit, lunaticShownExplicit);
    assert.deepEqual(restored.library.bags[0].lunaticBluffs, ["chef", "empath", "monk"]);
  }
  const legacy = normalizeLibrary({ bags: [{ ...bag, lunaticShownId: "po" }] }).bags[0];
  assert.equal(legacy.lunaticShownExplicit, true);
  assert.equal(legacy.lunaticBluffs, undefined);
});

test("normalization keeps supported roles and drops malformed entries", () => {
  const library = normalizeLibrary({
    pools: [
      { name: "Good pool", roles: ["chef", "empath", "monk", "poisoner", "imp", "chef"] },
      { name: "", roles: ["chef"] },
      { name: "Tiny", roles: ["chef"] },
      { name: "Unknown", roles: ["chef", "empath", "monk", "poisoner", "imp", "nope"] },
    ],
    bags: [
      bag,
      { name: "Big", roles: Array.from({ length: 16 }, () => "chef") },
      { name: "Unknown", roles: ["chef", "empath", "monk", "poisoner", "imp", "nope"] },
    ],
  });
  assert.equal(library.pools.length, 2);
  assert.deepEqual(library.pools[0].roles, ["chef", "empath", "monk", "poisoner", "imp"]);
  assert.equal(library.bags.length, 2);
  assert.deepEqual(library.bags[0].roles, bag.roles);
  assert.ok(!library.bags[1].roles.includes("nope"));
});

test("pools and bags can be added, updated and removed by id", () => {
  let library = emptyLibrary();
  const added = upsertPool(library, { name: "Pool", roles: bag.roles });
  if (!added.ok) assert.fail(added.error);
  library = added.library;
  assert.equal(library.pools.length, 1);

  const renamed = upsertPool(library, { id: added.pool.id, name: "Renamed", roles: bag.roles });
  if (!renamed.ok) assert.fail(renamed.error);
  assert.equal(renamed.library.pools[0].name, "Renamed");
  assert.equal(renamed.library.pools.length, 1);

  const withBag = upsertBag(renamed.library, bag);
  if (!withBag.ok) assert.fail(withBag.error);
  assert.equal(withBag.library.bags.length, 1);

  assert.equal(removeBag(withBag.library, withBag.bag.id).library.bags.length, 0);
  assert.equal(removePool(renamed.library, added.pool.id).library.pools.length, 0);
});

const fullCollection = Array.from({ length: 200 }, (_, i) => ({
  ...bag,
  id: String(i),
  name: `Entry ${i}`,
}));

test("a full collection rejects new entries, allows updates and frees space after a deletion", () => {
  for (const kind of ["bags", "pools"] as const) {
    fakeStorage();
    const full = normalizeLibrary({ [kind]: fullCollection });
    const save = kind === "bags" ? upsertBag : upsertPool;
    const remove = kind === "bags" ? removeBag : removePool;
    assert.equal(writeLibrary(full).ok, true);

    const added = save(full, { ...bag, name: "New entry" });
    assert.equal(added.ok, false);
    assert.equal(added.error, "capacity");
    assert.deepEqual(readLibrary().library, full);

    const otherSave = kind === "bags" ? upsertPool : upsertBag;
    const independent = otherSave(full, bag);
    assert.equal(independent.ok, true);
    assert.deepEqual(independent.library[kind], full[kind]);
    assert.equal(independent.library[kind === "bags" ? "pools" : "bags"].length, 1);

    const edited = save(full, { ...full[kind][199], name: "Renamed" });
    assert.equal(edited.ok, true);
    assert.equal(writeLibrary(edited.library).ok, true);
    const persisted = readLibrary().library[kind];
    assert.deepEqual(
      persisted.map((entry) => entry.id),
      fullCollection.map((entry) => entry.id),
    );
    assert.equal(persisted[199].name, "Renamed");

    const removed = remove(edited.library, "0");
    const retried = save(removed.library, { ...bag, id: "replacement" });
    assert.equal(retried.ok, true);
    assert.equal(writeLibrary(retried.library).ok, true);
    assert.deepEqual(
      readLibrary().library[kind].map((entry) => entry.id),
      ["replacement", ...fullCollection.slice(1).map((entry) => entry.id)],
    );
  }
});

test("oversized imports and writes preserve all existing bags and pools", () => {
  const storage = fakeStorage();
  const existing = normalizeLibrary({ bags: [bag], pools: [bag] });
  assert.equal(writeLibrary(existing).ok, true);
  const before = storage.get(LIBRARY_KEY);
  for (const kind of ["bags", "pools"] as const) {
    const payload = {
      ...existing,
      format: "pocket-grimoire-library",
      [kind]: [...fullCollection, { ...bag, id: "extra" }],
    };
    const imported = parseLibrary(JSON.stringify(payload));
    assert.equal(imported.ok, false);
    assert.equal(imported.error, "capacity");
    assert.deepEqual(writeLibrary(payload), { ok: false, error: "capacity" });
    assert.equal(storage.get(LIBRARY_KEY), before);
  }
});

test("upsert rejects entries without a name or with a bad role count", () => {
  const library = emptyLibrary();
  assert.equal(upsertPool(library, { name: "", roles: bag.roles }).ok, false);
  assert.equal(upsertPool(library, { name: "Pool", roles: ["chef"] }).ok, false);
  assert.equal(upsertBag(library, { name: "Bag", roles: ["chef"] }).ok, false);
  assert.equal(upsertBag(library, { name: "", roles: bag.roles }).ok, false);
});

test("export and parse round-trip the library", () => {
  const poolSave = upsertPool(emptyLibrary(), { name: "Pool", roles: bag.roles });
  if (!poolSave.ok) assert.fail(poolSave.error);
  const bagSave = upsertBag(poolSave.library, bag);
  if (!bagSave.ok) assert.fail(bagSave.error);
  const library = bagSave.library;
  const text = exportLibrary(library);
  const parsed = parseLibrary(text);
  if (!parsed.ok) assert.fail(parsed.error);
  assert.deepEqual(parsed.library.pools, library.pools);
  assert.deepEqual(parsed.library.bags, library.bags);
  assert.equal(parseLibrary("{").ok, false);
  assert.equal(parseLibrary(JSON.stringify({ format: "other", pools: [], bags: [] })).ok, false);
  assert.equal(
    parseLibrary(
      JSON.stringify({ format: "pocket-grimoire-library", version: 1, pools: [], bags: [] }),
    ).ok,
    false,
  );
});

test("the library uses its own key and never touches the game key", () => {
  const values = fakeStorage();
  values.set(STORAGE_KEY, "game");
  const saved = upsertBag(emptyLibrary(), bag);
  if (!saved.ok) assert.fail(saved.error);
  const library = saved.library;
  assert.equal(writeLibrary(library).ok, true);
  assert.ok(values.has(LIBRARY_KEY));
  assert.equal(values.get(STORAGE_KEY), "game");
  const loaded = readLibrary();
  if (!loaded.ok) assert.fail(loaded.error);
  assert.deepEqual(loaded.library.bags[0].roles, bag.roles);
});

test("a corrupt library read does not throw", () => {
  const values = fakeStorage();
  values.set(LIBRARY_KEY, "{");
  const loaded = readLibrary();
  assert.equal(loaded.ok, false);
  assert.deepEqual(loaded.library, emptyLibrary());
});

test("concurrent library writers keep independent additions and reject stale edits, deletions and replacement imports", async () => {
  fakeStorage();
  const base = emptyLibrary();
  const [a, b] = await Promise.all([
    editLibrary(base, { type: "saveBag", entry: { ...bag, name: "A" } }),
    editLibrary(base, { type: "saveBag", entry: { ...bag, name: "B" } }),
  ]);
  assert.ok(a.ok && b.ok);
  const loaded = readLibrary().library;
  assert.deepEqual(loaded.bags.map((item) => item.name).sort(), ["A", "B"]);
  const first = loaded.bags.find((item) => item.name === "A")!;
  const renamed = await editLibrary(loaded, {
    type: "saveBag",
    entry: { ...first, name: "Renamed" },
  });
  assert.ok(renamed.ok);
  const stale = await editLibrary(loaded, { type: "removeBag", id: first.id });
  assert.ok(!stale.ok && stale.error === "conflict");
  const staleSave = await editLibrary(loaded, {
    type: "saveBag",
    entry: { ...first, name: "Overwrite" },
  });
  assert.ok(!staleSave.ok && staleSave.error === "conflict");
  const fromLoadedBag = await editLibrary(readLibrary().library, {
    type: "saveBag",
    entry: { ...first, name: "Stale loaded bag" },
    expected: first,
  });
  assert.ok(!fromLoadedBag.ok && fromLoadedBag.error === "conflict");
  const staleImport = await editLibrary(loaded, { type: "replace", library: emptyLibrary() });
  assert.ok(!staleImport.ok && staleImport.error === "conflict");
  const imported = await editLibrary(readLibrary().library, {
    type: "replace",
    library: emptyLibrary(),
  });
  assert.ok(imported.ok);
  assert.deepEqual(readLibrary().library, emptyLibrary());
});

test("without Web Locks a writer can retry a busy library without losing an independent entry", async (t) => {
  const values = fakeStorage();
  t.mock.getter(Object.getPrototypeOf(navigator), "locks", () => undefined);
  const base = emptyLibrary();
  values.set(LIBRARY_KEY + ".writer.expired", String(Date.now() - 1));
  const operations = [
    { type: "savePool", entry: { name: "Pool A", roles: bag.roles } },
    { type: "savePool", entry: { name: "Pool B", roles: bag.roles } },
  ] as const;
  const results = await Promise.all(operations.map((op) => editLibrary(base, op)));
  assert.equal(results.filter((res) => res.ok).length, 1);
  const index = results.findIndex((res) => !res.ok && res.error === "busy");
  assert.ok(index >= 0);
  assert.ok((await editLibrary(base, operations[index]!)).ok);
  assert.deepEqual(
    readLibrary()
      .library.pools.map((pool) => pool.name)
      .sort(),
    ["Pool A", "Pool B"],
  );
  assert.deepEqual([...values.keys()], [LIBRARY_KEY]);
});

test("updating an older library retains generated entry identifiers while its bytes are unchanged", async () => {
  const values = fakeStorage();
  values.set(LIBRARY_KEY, JSON.stringify({ bags: [bag] }));
  const loaded = readLibrary().library;
  const existing = loaded.bags[0]!;
  const reopened = readLibrary(loaded).library;
  const result = await editLibrary(reopened, {
    type: "saveBag",
    entry: { ...existing, name: "Restored" },
    expected: existing,
  });
  assert.ok(result.ok);
  assert.deepEqual(
    readLibrary().library.bags.map((item) => [item.id, item.name]),
    [[existing.id, "Restored"]],
  );
});
