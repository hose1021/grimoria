import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  applyCorrections,
  baselineCoverageFailures,
  canonicalBytes,
  correctionFailures,
  originFailures,
  parseBaseline,
  parseIndex,
  baselineFailures,
  entriesFrom,
  historicalFailures,
  provenanceFailures,
  refArchiveFailures,
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

test("the original baseline catches a coordinated archive deletion", () => {
  const anchor = [{ name: "2026-11-01-a", treeHash: "0".repeat(64) }];
  assert.deepEqual(historicalFailures(anchor, [row("2026-11-01-a")]), []);
  const failures = historicalFailures(anchor, []);
  assert.ok(failures.some((failure) => failure.includes("removed since the original baseline")));
});

test("an archive accepted on the target branch cannot be removed", () => {
  const acceptedOnTarget = [
    { name: "2026-11-01-a", treeHash: "0".repeat(64) },
    { name: "2026-12-01-later-accepted", treeHash: "b".repeat(64) },
  ];
  const coordinated = [row("2026-11-01-a")];
  const failures = historicalFailures(acceptedOnTarget, coordinated);
  assert.ok(failures.some((failure) => failure.includes("2026-12-01-later-accepted")));
});

test("archive provenance validates path, date and commit shape", () => {
  const valid = { ...row("2026-11-01-a"), commit: "a".repeat(40), date: "2026-11-01" };
  assert.deepEqual(provenanceFailures(valid), []);
  assert.ok(
    provenanceFailures({ ...valid, path: "openspec/changes/archive/other" }).some((failure) =>
      failure.includes("canonical path"),
    ),
  );
  assert.ok(
    provenanceFailures({ ...valid, date: "01-11-2026" }).some((failure) =>
      failure.includes("ISO day"),
    ),
  );
  assert.ok(
    provenanceFailures({ ...valid, commit: "abc" }).some((failure) => failure.includes("SHA-1")),
  );
});

test("a target-branch archive tree cannot lose or rewrite an accepted change", () => {
  const accepted = [{ name: "2026-11-01-a", treeHash: "0".repeat(64) }];
  assert.deepEqual(refArchiveFailures(accepted, [row("2026-11-01-a")]), []);
  assert.ok(refArchiveFailures(accepted, []).some((failure) => failure.includes("is gone")));
  assert.ok(
    refArchiveFailures(
      [{ name: "2026-11-01-a", treeHash: "f".repeat(64) }],
      [row("2026-11-01-a")],
    ).some((failure) => failure.includes("changed since the target branch")),
  );
});

test("archive hashes canonicalize text and keep binary bytes", () => {
  assert.equal(canonicalBytes(Buffer.from("a\r\nb\r\n")).toString(), "a\nb\n");
  const binary = Buffer.from([1, 0, 2]);
  assert.deepEqual(canonicalBytes(binary), binary);
  assert.deepEqual(canonicalBytes(Buffer.from([0, 13, 10])), Buffer.from([0, 13, 10]));
  assert.deepEqual(canonicalBytes(Buffer.from("\uFEFFa\r\n")), Buffer.from("\uFEFFa\n"));
});

test("provenance survives a squash with missing origin commits", () => {
  const existing = { commit: "a".repeat(40), date: "2026-11-01" };
  const fresh = { commit: "b".repeat(40), date: "2026-12-01" };
  const entry = { ...row("2026-11-01-a"), ...existing };
  assert.deepEqual(
    originFailures(
      [entry],
      () => fresh,
      () => entry,
    ),
    [],
  );
  assert.ok(
    originFailures(
      [{ ...entry, date: fresh.date }],
      () => fresh,
      () => entry,
    ).length,
  );
});

test("a recorded origin must be the first add, not a later one", () => {
  const entry = { ...row("2026-11-01-a"), commit: "a".repeat(40) };
  assert.deepEqual(
    originFailures(
      [entry],
      () => entry,
      () => undefined,
    ),
    [],
  );
  assert.ok(
    originFailures(
      [entry],
      () => ({ ...entry, commit: "b".repeat(40) }),
      () => undefined,
    ).length,
  );
  assert.ok(
    originFailures(
      [entry],
      () => null,
      () => undefined,
    ).length,
  );
});

test("an explicit correction replaces a baseline hash and needs a reason", () => {
  const baseline = [{ name: "2026-11-01-a", treeHash: "a".repeat(64) }];
  const corrections = [
    { name: "2026-11-01-a", fromHash: "a".repeat(64), toHash: "b".repeat(64), reason: "reviewed" },
  ];
  assert.deepEqual(applyCorrections(baseline, corrections), [
    { name: "2026-11-01-a", treeHash: "b".repeat(64) },
  ]);
  assert.deepEqual(applyCorrections(baseline, []), baseline);
});

test("binary bytes without a NUL stay unchanged and index metadata is validated", () => {
  const binary = Buffer.from([0xff, 0x00, 0xfe]);
  assert.deepEqual(canonicalBytes(binary), binary);
  const single = Buffer.from([0xff]);
  assert.deepEqual(canonicalBytes(single), single);
  const duplicate = row("2026-11-01-a");
  assert.equal(
    parseIndex(
      JSON.stringify({
        schemaVersion: 2,
        canonicalization: "text-lf-binary-raw-v1",
        entries: [duplicate, duplicate],
      }),
    ),
    null,
  );
  assert.equal(parseIndex("not json"), null);
  assert.equal(parseIndex(JSON.stringify({ schemaVersion: 1, entries: [] })), null);
  assert.equal(
    parseIndex(JSON.stringify({ schemaVersion: 2, canonicalization: "other", entries: [] })),
    null,
  );
  assert.deepEqual(
    parseIndex(
      JSON.stringify({ schemaVersion: 2, canonicalization: "text-lf-binary-raw-v1", entries: [] }),
    ),
    [],
  );
});

test("a new archive cannot use a fabricated origin", () => {
  const fresh = { ...row("2026-12-01-new"), commit: "c".repeat(40) };
  const fake = { ...fresh, commit: "d".repeat(40) };
  assert.ok(
    originFailures(
      [fake],
      () => fresh,
      () => undefined,
    ).length,
  );
  assert.ok(
    originFailures(
      [fake],
      () => null,
      () => fresh,
    ).length,
  );
});

test("archive corrections are unique and target the current tree", () => {
  const index = [row("2026-11-01-a")];
  const good = {
    name: "2026-11-01-a",
    fromHash: "a".repeat(64),
    toHash: "0".repeat(64),
    reason: "reviewed",
  };
  assert.deepEqual(correctionFailures([good], index), []);
  assert.ok(
    correctionFailures([good, { ...good, fromHash: "b".repeat(64) }], index).some((failure) =>
      failure.includes("only one correction"),
    ),
  );
  assert.ok(
    correctionFailures([{ ...good, toHash: "c".repeat(64) }], index).some((failure) =>
      failure.includes("not the current tree"),
    ),
  );
});

test("the committed archive index carries an origin and issue reference", () => {
  const index = JSON.parse(
    readFileSync(new URL("../docs/audits/openspec-archive-index.json", import.meta.url), "utf8"),
  ) as { entries: Array<{ name: string; commit: string; issue?: string | null }> };
  const names = readdirSync(new URL("../openspec/changes/archive/", import.meta.url), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(index.entries.map((entry) => entry.name).sort(), names);
  for (const entry of index.entries) {
    assert.match(entry.commit, /^[0-9a-f]{40}$/, entry.name);
    assert.ok(
      entry.issue === null || entry.issue === undefined || /^#\d+$/.test(entry.issue),
      entry.name,
    );
  }
  assert.ok(index.entries.some((entry) => typeof entry.issue === "string"));
});
