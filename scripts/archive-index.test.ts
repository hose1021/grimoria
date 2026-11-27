import assert from "node:assert/strict";
import test from "node:test";
import { baselineFailures, entriesFrom, mergeEntries, type ArchiveEntry } from "./archive-index.ts";

const row = (name: string): ArchiveEntry => ({
  name,
  commit: name.slice(-1).repeat(40),
  date: "2026-11-01",
  path: `openspec/changes/archive/${name}`,
  treeHash: "0".repeat(64),
});

test("the archive index sorts by name and rejects a duplicate entry", () => {
  assert.deepEqual(
    entriesFrom([row("2026-11-02-b"), row("2026-11-01-a")]).map((entry) => entry.name),
    ["2026-11-01-a", "2026-11-02-b"],
  );
  assert.throws(
    () => entriesFrom([row("2026-11-01-a"), row("2026-11-01-a")]),
    /duplicate archive entry/,
  );
});

test("a later archive keeps every historical record", () => {
  const merged = mergeEntries([row("2026-11-01-a")], [row("2026-11-01-a"), row("2026-11-03-c")]);
  assert.deepEqual(
    merged.map((entry) => entry.name),
    ["2026-11-01-a", "2026-11-03-c"],
  );
});

test("a re-archive keeps the historical record unchanged", () => {
  const historical = { ...row("2026-11-01-a"), commit: "f".repeat(40) };
  const rebuilt = { ...row("2026-11-01-a"), commit: "e".repeat(40) };
  assert.equal(mergeEntries([historical], [rebuilt])[0].commit, historical.commit);
});

test("a disappeared historical record stops the index build", () => {
  assert.throws(() => mergeEntries([row("2026-11-01-a")], [row("2026-11-03-c")]), /disappeared/);
});

test("the baseline rejects a dropped or rewritten archived tree", () => {
  const baseline = [
    { name: "2026-11-01-a", treeHash: "a".repeat(64) },
    { name: "2026-11-02-b", treeHash: "b".repeat(64) },
  ];
  const index = [row("2026-11-01-a"), { ...row("2026-11-02-b"), treeHash: "c".repeat(64) }];
  assert.deepEqual(baselineFailures(baseline, index), ["2026-11-01-a", "2026-11-02-b"]);
  assert.deepEqual(
    baselineFailures(
      baseline,
      baseline.map((entry) => ({ ...row(entry.name), treeHash: entry.treeHash })),
    ),
    [],
  );
});
