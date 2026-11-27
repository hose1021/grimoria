import assert from "node:assert/strict";
import test from "node:test";
import {
  baselineCoverageFailures,
  parseBaseline,
  baselineFailures,
  entriesFrom,
  mergeEntries,
  type ArchiveEntry,
} from "./archive-index.ts";

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

test("a re-archive takes the provenance the history scan derived", () => {
  const historical = { ...row("2026-11-01-a"), commit: "f".repeat(40) };
  const rebuilt = { ...row("2026-11-01-a"), commit: "e".repeat(40) };
  assert.equal(mergeEntries([historical], [rebuilt])[0].commit, rebuilt.commit);
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

test("the baseline rejects duplicates, extra records and unpinned trees", () => {
  const baseline = [
    { name: "2026-11-01-a", treeHash: "a".repeat(64) },
    { name: "2026-11-01-a", treeHash: "a".repeat(64) },
    { name: "2026-11-02-b", treeHash: "b".repeat(64) },
  ];
  const index = [row("2026-11-01-a")];
  const failures = baselineCoverageFailures(baseline, index);
  assert.ok(failures.some((failure) => failure.includes("duplicate baseline record")));
  assert.ok(failures.some((failure) => failure.includes("has no index entry")));
  assert.deepEqual(
    baselineCoverageFailures([{ name: "2026-11-01-a", treeHash: "x" }], [row("2026-11-01-a")]),
    [],
  );
  assert.ok(
    baselineCoverageFailures([], [row("2026-11-01-a")]).some((failure) =>
      failure.includes("not pinned"),
    ),
  );
});

test("a malformed baseline cannot silently drop pinned records", () => {
  assert.equal(parseBaseline("not json"), null);
  assert.equal(parseBaseline(JSON.stringify({ schemaVersion: 2, entries: [] })), null);
  assert.equal(
    parseBaseline(JSON.stringify({ schemaVersion: 1, entries: [{ name: "x", treeHash: "a" }] })),
    null,
  );
  assert.equal(
    parseBaseline(
      JSON.stringify({
        schemaVersion: 1,
        entries: [{ name: "2026-11-01-a", treeHash: "a".repeat(64) }],
      }),
    )?.length,
    1,
  );
});
