import test from "node:test";
import assert from "node:assert/strict";
import {
  LIBRARY_KEY,
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

function fakeStorage(): Map<string, string> {
  const values = new Map<string, string>();
  globalThis.localStorage = {
    length: 0,
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
