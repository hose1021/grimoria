import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  anchorFailures,
  appendBaseline,
  applyCorrections,
  archiveOriginFailures,
  archiveReadinessFailures,
  baselineCoverageFailures,
  canonicalBytes,
  correctionFailures,
  historicalReferences,
  legacyPathFailures,
  originFailures,
  originRecordFailures,
  parseBaseline,
  parseIndex,
  parseLegacyPaths,
  parseOrigins,
  parseTestCorrections,
  baselineFailures,
  entriesFrom,
  historicalFailures,
  provenanceFailures,
  readCorrections,
  refArchiveFailures,
  repinFailures,
  testReferenceFailures,
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
  ) as {
    entries: Array<{ name: string; commit: string; issue?: string | null; tests?: string[] }>;
  };
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
  const withTests = index.entries.filter((entry) => entry.tests && entry.tests.length > 0);
  assert.ok(withTests.length >= 100, `only ${withTests.length} entries list asserting tests`);
  assert.ok(
    withTests.some((entry) => entry.tests!.some((file) => file.endsWith(".test.ts"))),
    "asserting test files are the implementation evidence",
  );
});

test("archive origins survive squash integration into a legacy target", () => {
  const root = mkdtempSync(join(tmpdir(), "archive-lifecycle-"));
  const git = (args: string[], cwd = root): string =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const write = (file: string, content: string): void => {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  try {
    git(["init", "-q"]);
    git(["config", "user.email", "test@example.com"]);
    git(["config", "user.name", "Test"]);
    const name = "2026-01-01-sample";
    const archivePath = `openspec/changes/archive/${name}`;
    write(`${archivePath}/proposal.md`, "Issue: #1\n");
    write(
      `${archivePath}/specs/game/sample/spec.md`,
      "### Requirement: One\n\n**Tests**: `src/sample.test.ts`\n",
    );
    git(["add", "."]);
    git(["commit", "-qm", "feature archive"]);
    const feature = git(["rev-parse", "HEAD"]);
    const entry = (commit: string) => ({
      name,
      commit,
      date: "2026-01-01",
      path: archivePath,
      treeHash: "a".repeat(64),
      issue: "#1",
      tests: ["src/sample.test.ts"],
    });
    const index = (entries: unknown[]) =>
      JSON.stringify({
        schemaVersion: 2,
        canonicalization: "text-lf-binary-raw-v1",
        entries,
      });
    write("docs/audits/openspec-archive-index.json", index([entry(feature)]));
    write(
      "docs/audits/openspec-archive-baseline.json",
      JSON.stringify({ schemaVersion: 1, entries: [] }),
    );
    write(
      "fixtures/conformance/openspec-archive-baseline.json",
      JSON.stringify({ schemaVersion: 1, entries: [] }),
    );
    write("fixtures/conformance/archive-corrections.json", JSON.stringify({ corrections: [] }));
    git(["add", "."]);
    git(["commit", "-qm", "record origin"]);
    const record = git(["rev-parse", "HEAD"]);

    // Squash integration: a new root commit with the same tree.
    git(["checkout", "-q", "--orphan", "dev"]);
    git(["add", "."]);
    git(["commit", "-qm", "squash dev"]);
    const squash = git(["rev-parse", "HEAD"]);
    git(["branch", "-D", "master"]);

    // Legacy main has no archive index.
    git(["checkout", "-q", "--orphan", "main"]);
    for (const tracked of git(["ls-files"]).split("\n").filter(Boolean))
      git(["rm", "-q", "--cached", tracked]);
    write("README.md", "# main\n");
    git(["add", "README.md"]);
    git(["commit", "-qm", "legacy main"]);
    git(["checkout", "-f", "-q", "dev"]);

    const entries = parseIndex(
      readFileSync(join(root, "docs/audits/openspec-archive-index.json"), "utf8"),
    );
    assert.ok(entries);
    // The squash rewrote the first add; without a reviewed record the recorded
    // origin is self-attested and must fail, even for a legacy target.
    write("fixtures/conformance/archive-origins.json", JSON.stringify({ origins: [] }));
    assert.ok(
      archiveOriginFailures(root, entries!, "main").some((failure) =>
        failure.includes("origin differs"),
      ),
      "an unrecorded squash origin fails",
    );
    write(
      "fixtures/conformance/archive-origins.json",
      JSON.stringify({
        origins: [
          {
            name,
            commit: feature,
            date: "2026-01-01",
            reason: "squashed into dev; the feature commit is gone",
          },
        ],
      }),
    );
    git(["add", "."]);
    git(["commit", "-qm", "accept origin record"]);
    assert.deepEqual(archiveOriginFailures(root, entries!, "main"), []);

    // A fresh clone keeps only the integrated history.
    const clone = mkdtempSync(join(tmpdir(), "archive-clone-"));
    execFileSync("git", ["clone", "-q", "--no-local", root, clone], { encoding: "utf8" });
    execFileSync("git", ["checkout", "-q", "dev"], { cwd: clone });
    execFileSync("git", ["branch", "main", "origin/main"], { cwd: clone });
    const cloneGit = (args: string[]): string =>
      execFileSync("git", args, { cwd: clone, encoding: "utf8" }).trim();
    assert.throws(() => cloneGit(["cat-file", "-e", feature]));
    const cloneEntries = parseIndex(
      readFileSync(join(clone, "docs/audits/openspec-archive-index.json"), "utf8"),
    );
    assert.ok(cloneEntries);
    assert.deepEqual(archiveOriginFailures(clone, cloneEntries!, "dev"), []);
    assert.deepEqual(archiveOriginFailures(clone, cloneEntries!, "main"), []);

    // A fabricated origin for a genuinely new archive fails against dev.
    const fabricated = [
      ...cloneEntries!,
      {
        ...entry("f".repeat(40)),
        name: "2026-02-01-fabricated",
        path: "openspec/changes/archive/2026-02-01-fabricated",
      },
    ];
    assert.ok(
      archiveOriginFailures(clone, fabricated, "dev").some((failure) =>
        failure.includes("2026-02-01-fabricated"),
      ),
    );
    assert.ok(squash.length > 0 && record.length > 0);
    rmSync(clone, { recursive: true, force: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("archive origins survive repeated feature, squash, release and back-merge cycles", () => {
  const root = mkdtempSync(join(tmpdir(), "archive-cycle-"));
  const git = (args: string[]): string =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const write = (file: string, content: string): void => {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  const indexPath = "docs/audits/openspec-archive-index.json";
  const writeIndex = (entries: unknown[]): void =>
    write(
      indexPath,
      JSON.stringify(
        { schemaVersion: 2, canonicalization: "text-lf-binary-raw-v1", entries },
        null,
        2,
      ),
    );
  const readEntries = (): ArchiveEntry[] =>
    parseIndex(readFileSync(join(root, indexPath), "utf8"))!;
  const archive = (name: string, issue: number) => {
    const path = `openspec/changes/archive/${name}`;
    write(`${path}/proposal.md`, `Issue: #${issue}\n`);
    write(
      `${path}/specs/game/sample/spec.md`,
      "### Requirement: One\n\n**Tests**: `src/sample.test.ts`\n",
    );
    return path;
  };
  const commitOrigin = (name: string, path: string) => {
    const commit = git(["rev-parse", "HEAD"]);
    const date = git(["log", "-1", "--format=%cs"]);
    return { name, commit, date, path, treeHash: "a".repeat(64), issue: "#1", tests: [] };
  };
  try {
    git(["init", "-q", "-b", "dev"]);
    git(["config", "user.email", "test@example.com"]);
    git(["config", "user.name", "Test"]);
    writeIndex([]);
    write("README.md", "# dev\n");
    git(["add", "."]);
    git(["commit", "-qm", "dev base"]);
    git(["branch", "main"]);

    // Release 1: one archive integrated by squash, then released by squash.
    git(["checkout", "-q", "-b", "feat/one"]);
    const pathOne = archive("2026-01-01-one", 1);
    git(["add", "."]);
    git(["commit", "-qm", "feat one"]);
    const one = commitOrigin("2026-01-01-one", pathOne);
    writeIndex([one]);
    git(["add", "."]);
    git(["commit", "-qm", "record origin"]);
    const featureOne = one.commit;
    git(["checkout", "-q", "dev"]);
    git(["merge", "-q", "--squash", "feat/one"]);
    git(["commit", "-qm", "integrate one"]);
    git(["branch", "-D", "feat/one"]);
    write(
      "fixtures/conformance/archive-origins.json",
      JSON.stringify({
        origins: [
          {
            name: "2026-01-01-one",
            commit: one.commit,
            date: one.date,
            reason: "squashed into dev; the feature commit is gone",
          },
        ],
      }),
    );
    git(["add", "."]);
    git(["commit", "-qm", "accept one origin"]);
    git(["checkout", "-q", "main"]);
    git(["merge", "-q", "--squash", "dev"]);
    git(["commit", "-qm", "release 1"]);
    git(["checkout", "-q", "dev"]);
    git(["merge", "-q", "main", "-m", "back-merge one"]);

    // The feature commit that named the origin is no longer an ancestor.
    assert.throws(() => git(["merge-base", "--is-ancestor", featureOne, "dev"]));

    // Release 2: a second archive is squashed into dev, then released.
    git(["checkout", "-q", "-b", "feat/two"]);
    const pathTwo = archive("2026-02-01-two", 2);
    git(["add", "."]);
    git(["commit", "-qm", "feat two"]);
    const two = commitOrigin("2026-02-01-two", pathTwo);
    writeIndex([one, two]);
    const twoEntries = readEntries();
    assert.deepEqual(archiveOriginFailures(root, twoEntries, "main"), []);
    assert.deepEqual(archiveOriginFailures(root, twoEntries, "dev"), []);
    git(["add", "."]);
    git(["commit", "-qm", "record second origin"]);
    git(["checkout", "-q", "dev"]);
    git(["merge", "-q", "--squash", "feat/two"]);
    git(["commit", "-qm", "integrate two"]);
    git(["branch", "-D", "feat/two"]);

    // The squash rewrote the second first add; the origin needs a record.
    assert.ok(
      archiveOriginFailures(root, readEntries(), "main").some((failure) =>
        failure.includes("2026-02-01-two: origin differs"),
      ),
      "an unrecorded squash origin fails the release check",
    );
    write(
      "fixtures/conformance/archive-origins.json",
      JSON.stringify({
        origins: [
          {
            name: "2026-01-01-one",
            commit: one.commit,
            date: one.date,
            reason: "squashed into dev; the feature commit is gone",
          },
          {
            name: "2026-02-01-two",
            commit: two.commit,
            date: two.date,
            reason: "squashed into dev; the feature commit is gone",
          },
        ],
      }),
    );
    git(["add", "."]);
    git(["commit", "-qm", "accept two origin"]);

    // The release pull request checks the squashed dev tree against main.
    assert.deepEqual(archiveOriginFailures(root, readEntries(), "main"), []);

    const previousMain = git(["rev-parse", "main"]);
    git(["checkout", "-q", "main"]);
    git(["merge", "-q", "--squash", "dev"]);
    git(["commit", "-qm", "release 2"]);
    const released = readEntries();
    assert.deepEqual(archiveOriginFailures(root, released, previousMain), []);
    assert.deepEqual(archiveOriginFailures(root, released, "main"), []);

    // A later back-merge keeps the accepted records.
    git(["checkout", "-q", "dev"]);
    git(["merge", "-q", "main", "-m", "back-merge two"]);
    assert.deepEqual(archiveOriginFailures(root, readEntries(), "main"), []);

    // A rewritten origin for an archive main accepted still fails.
    const rewritten = readEntries().map((entry) =>
      entry.name === "2026-02-01-two" ? { ...entry, commit: "f".repeat(40) } : entry,
    );
    assert.ok(
      archiveOriginFailures(root, rewritten, "main").some((failure) =>
        failure.includes("2026-02-01-two"),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a same-commit origin is self-attested and fails", () => {
  const root = mkdtempSync(join(tmpdir(), "archive-self-"));
  const git = (args: string[]): string =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const write = (file: string, content: string): void => {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  try {
    git(["init", "-q", "-b", "dev"]);
    git(["config", "user.email", "test@example.com"]);
    git(["config", "user.name", "Test"]);
    write("README.md", "# dev\n");
    git(["add", "."]);
    git(["commit", "-qm", "base"]);
    git(["branch", "base"]);

    // The archive and an index entry with an older origin land in one commit.
    const name = "2026-01-01-self";
    const path = `openspec/changes/archive/${name}`;
    write(`${path}/proposal.md`, "Issue: #1\n");
    write(
      `${path}/specs/game/sample/spec.md`,
      "### Requirement: One\n\n**Tests**: `src/sample.test.ts`\n",
    );
    const fake = "f".repeat(40);
    write(
      "docs/audits/openspec-archive-index.json",
      JSON.stringify({
        schemaVersion: 2,
        canonicalization: "text-lf-binary-raw-v1",
        entries: [
          {
            name,
            commit: fake,
            date: "2026-01-01",
            path,
            treeHash: "a".repeat(64),
            issue: "#1",
            tests: [],
          },
        ],
      }),
    );
    write("fixtures/conformance/archive-origins.json", JSON.stringify({ origins: [] }));
    git(["add", "."]);
    git(["commit", "-qm", "self-attested origin"]);
    const first = git(["rev-parse", "HEAD"]);
    const entries = parseIndex(
      readFileSync(join(root, "docs/audits/openspec-archive-index.json"), "utf8"),
    )!;
    assert.ok(
      archiveOriginFailures(root, entries, "base").some((failure) =>
        failure.includes("origin differs"),
      ),
      "an origin written beside the archive cannot attest itself",
    );
    write(
      "fixtures/conformance/archive-origins.json",
      JSON.stringify({
        origins: [{ name, commit: fake, date: "2026-01-01", reason: "reviewed squash" }],
      }),
    );
    assert.deepEqual(
      archiveOriginFailures(root, entries, "base"),
      [],
      "a reviewed record distinguishes an integrated origin from self-attestation",
    );
    const honest = entries.map((entry) => ({
      ...entry,
      commit: first,
      date: git(["log", "-1", "--format=%cs"]),
    }));
    assert.deepEqual(
      archiveOriginFailures(root, honest, "base"),
      [],
      "recording the first add needs no record",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a dangling archived test reference needs a reviewed correction", () => {
  const entry = {
    ...row("2026-11-01-a"),
    tests: ["src/kept.test.ts", "src/gone.test.ts"],
  };
  const state = (path: string): "file" | "missing" | "other" =>
    path === "src/kept.test.ts" || path === "src/rewritten.test.ts" ? "file" : "missing";
  const correction = {
    archive: "2026-11-01-a",
    from: "src/gone.test.ts",
    to: "src/rewritten.test.ts",
    reason: "renamed",
  };
  const dangling = testReferenceFailures([entry], [], state);
  assert.ok(dangling.some((failure) => failure.includes("src/gone.test.ts")));
  assert.deepEqual(testReferenceFailures([entry], [correction], state), []);
  assert.ok(
    testReferenceFailures([entry], [{ ...correction, archive: "other" }], state).some((failure) =>
      failure.includes("names no archived change"),
    ),
  );
  assert.ok(
    testReferenceFailures(
      [entry],
      [{ ...correction, from: "src/not-indexed.test.ts" }],
      state,
    ).some((failure) => failure.includes("not an indexed test reference")),
  );
  assert.ok(
    testReferenceFailures([entry], [{ ...correction, reason: " " }], state).some((failure) =>
      failure.includes("no reason"),
    ),
  );
  assert.ok(
    testReferenceFailures([entry], [{ ...correction, to: "src/missing.test.ts" }], state).some(
      (failure) => failure.includes("not a regular file"),
    ),
  );
  assert.ok(
    testReferenceFailures([entry], [{ ...correction, to: "src/kept.ts" }], (path) =>
      path === "src/kept.ts" ? "file" : "missing",
    ).some((failure) => failure.includes("not an asserting test file")),
  );
  assert.ok(
    testReferenceFailures([entry], [correction, correction], state).some((failure) =>
      failure.includes("duplicate correction"),
    ),
  );
  assert.ok(
    testReferenceFailures([entry], [{ ...correction, from: "src/kept.test.ts" }], state).some(
      (failure) => failure.includes("stale"),
    ),
  );
  assert.ok(
    testReferenceFailures([{ ...entry, tests: ["src/dir.test.ts"] }], [], () => "other").some(
      (failure) => failure.includes("not a regular file"),
    ),
    "a directory or a symbolic link is not an asserting test",
  );
  assert.ok(
    testReferenceFailures(
      [{ ...entry, tests: ["src/online.test.ts"] }],
      [],
      () => "file",
      () => false,
    ).some((failure) => failure.includes("not an indexed test")),
    "a runnable test must be in the manifest",
  );
  assert.equal(parseTestCorrections("not json"), null);
  assert.equal(parseTestCorrections(JSON.stringify({ corrections: [{ archive: 1 }] })), null);
  assert.equal(parseTestCorrections(JSON.stringify({ corrections: [correction] }))?.length, 1);
});

test("an archive outside the accepted anchor must be finished and applied", () => {
  const anchored = { ...row("2026-11-01-a"), tests: [] };
  const fresh = { ...row("2026-12-01-b"), tests: [] };
  const anchor = [{ name: anchored.name, treeHash: anchored.treeHash }];
  const complete = "# Tasks\n\n- [x] 1.1 Done.\n\n## Evidence\n\n- RED: one\n- GREEN: two\n";
  const specPath = `${fresh.path}/specs/game/sample/spec.md`;
  const files = new Map([
    [`${anchored.path}/tasks.md`, "# Tasks\n\n- [ ] 1.1 Unfinished.\n"],
    [`${fresh.path}/tasks.md`, complete],
    [specPath, "## ADDED Requirements\n\n### Requirement: One\n\n**Tests**: `src/x.test.ts`\n"],
  ]);
  const read = (path: string) => files.get(path) ?? null;
  const list = (dir: string) => [...files.keys()].filter((path) => path.startsWith(dir + "/"));
  const baseline = (capability: string) =>
    capability === "game/sample" ? "## Requirements\n\n### Requirement: One\n" : null;
  const failures = archiveReadinessFailures([anchored, fresh], anchor, read, list, baseline);
  assert.deepEqual(failures, [], "the anchored archive is skipped and the fresh one applies");
  assert.deepEqual(
    archiveReadinessFailures(
      [fresh],
      anchor,
      (path) => files.get(path) ?? null,
      list,
      () => null,
    ).filter((failure) => failure.includes("not applied")),
    [`2026-12-01-b: requirement "One" is not applied to the baseline`],
  );
  files.set(
    specPath,
    "## REMOVED Requirements\n\n### Requirement: One\n\n**Tests**: `src/x.test.ts`\n",
  );
  assert.deepEqual(
    archiveReadinessFailures([fresh], anchor, read, list, baseline).filter((failure) =>
      failure.includes("still in the baseline"),
    ),
    [`2026-12-01-b: removed requirement "One" is still in the baseline`],
  );
  files.set(
    specPath,
    "## ADDED Requirements\n\n### Requirement: One\n\n**Tests**: `src/x.test.ts`\n",
  );
  files.set(
    `${fresh.path}/tasks.md`,
    "# Tasks\n\n- [x] 1.1 Done.\n\n## Evidence\n\n- RED:\n- GREEN: two\n",
  );
  assert.ok(
    archiveReadinessFailures([fresh], anchor, read, list, baseline).some((failure) =>
      failure.includes("no non-empty RED/GREEN evidence"),
    ),
    "an empty RED line is no evidence",
  );
  assert.deepEqual(
    archiveReadinessFailures(
      [fresh],
      anchor,
      () => null,
      () => [],
      () => null,
    ).some((failure) => failure.includes("no tasks.md")),
    true,
  );
});

test("an indented checklist and evidence line still count", () => {
  const entry = { ...row("2026-12-01-b"), tests: [] };
  const specPath = `${entry.path}/specs/game/sample/spec.md`;
  const baseline = () => "## Requirements\n\n### Requirement: One\n";
  const run = (tasks: string) =>
    archiveReadinessFailures(
      [entry],
      [],
      (path) =>
        path.endsWith("tasks.md")
          ? tasks
          : path === specPath
            ? "## ADDED Requirements\n\n### Requirement: One\n"
            : null,
      () => [specPath],
      baseline,
    );
  assert.deepEqual(
    run("- [x] 1\n  - [ ] 2 open\n\n- RED: r\n- GREEN: g\n").filter((failure) =>
      failure.includes("open task"),
    ),
    ["2026-12-01-b: archived change has 1 open task(s)"],
    "an indented open task is still open",
  );
  assert.deepEqual(run("- [x] 1\n  - RED: r\n  - GREEN: g\n"), [], "indented evidence counts");
});

test("a new archive is appended to the baseline and an accepted hash is never rewritten", () => {
  const baseline = [{ name: "2026-11-01-a", treeHash: "a".repeat(64) }];
  const rewritten = { ...row("2026-11-01-a"), treeHash: "b".repeat(64) };
  const added = { ...row("2026-12-01-b"), treeHash: "c".repeat(64) };
  assert.deepEqual(appendBaseline(baseline, [rewritten]), baseline);
  assert.deepEqual(appendBaseline(baseline, [rewritten, added]), [
    ...baseline,
    { name: "2026-12-01-b", treeHash: "c".repeat(64) },
  ]);
  assert.deepEqual(appendBaseline(baseline, []), baseline);
  assert.deepEqual(repinFailures(baseline, [rewritten], []), ["2026-11-01-a"]);
  assert.deepEqual(repinFailures(baseline, [], []), [], "an empty index protects nothing");
  assert.deepEqual(
    repinFailures(
      baseline,
      [rewritten],
      [
        {
          name: "2026-11-01-a",
          fromHash: "a".repeat(64),
          toHash: "b".repeat(64),
          reason: "reviewed",
        },
      ],
    ),
    [],
    "a reviewed correction allows the new hash",
  );
  assert.deepEqual(
    repinFailures(baseline, [rewritten, added], []),
    ["2026-11-01-a", "2026-12-01-b"],
    "a changed hash and a name with no baseline record are both refused",
  );
});

test("the original anchor cannot gain, lose or change a record", () => {
  const anchor = [
    { name: "2026-11-01-a", treeHash: "a".repeat(64) },
    { name: "2026-11-02-b", treeHash: "b".repeat(64) },
  ];
  assert.deepEqual(anchorFailures(anchor, anchor), []);
  assert.ok(
    anchorFailures(anchor, [{ name: "2026-11-01-a", treeHash: "a".repeat(64) }]).some((failure) =>
      failure.includes("2026-11-02-b"),
    ),
  );
  assert.ok(
    anchorFailures(anchor, [{ ...anchor[0]!, treeHash: "c".repeat(64) }, anchor[1]!]).some(
      (failure) => failure.includes("changed"),
    ),
  );
  assert.ok(
    anchorFailures(anchor, [...anchor, { name: "2026-12-01-new", treeHash: "d".repeat(64) }]).some(
      (failure) => failure.includes("gained a record"),
    ),
  );
});

test("malformed archive corrections and index files fail closed", () => {
  const dir = mkdtempSync(join(tmpdir(), "archive-corrections-"));
  try {
    assert.deepEqual(readCorrections(join(dir, "missing.json")), []);
    writeFileSync(join(dir, "bad.json"), "not json");
    assert.equal(readCorrections(join(dir, "bad.json")), null);
    writeFileSync(join(dir, "shape.json"), JSON.stringify({ corrections: [{ name: "x" }] }));
    assert.equal(readCorrections(join(dir, "shape.json")), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the archive CLI refuses a bypassed anchor, a re-pin and a malformed index", () => {
  const root = mkdtempSync(join(tmpdir(), "archive-cli-"));
  const git = (args: string[]): string =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const write = (file: string, content: string): void => {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  const run = (args: string[] = []) =>
    spawnSync(process.execPath, ["scripts/archive-index.ts", ...args], {
      cwd: root,
      encoding: "utf8",
    });
  const complete = "# Tasks\n\n- [x] 1.1 Done.\n\n## Evidence\n\n- RED: one\n- GREEN: two\n";
  const archive = (name: string, tasks: string | null): void => {
    const path = `openspec/changes/archive/${name}`;
    write(`${path}/proposal.md`, "Issue: #1\n");
    write(
      `${path}/specs/game/sample/spec.md`,
      "## ADDED Requirements\n\n### Requirement: One\n\n**Tests**: `src/sample.test.ts`\n",
    );
    if (tasks !== null) write(`${path}/tasks.md`, tasks);
  };
  const emptyBaseline = JSON.stringify({ schemaVersion: 1, entries: [] });
  try {
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(
      join(root, "scripts", "archive-index.ts"),
      readFileSync(fileURLToPath(new URL("./archive-index.ts", import.meta.url))),
    );
    writeFileSync(
      join(root, "scripts", "openspec-reconcile.ts"),
      readFileSync(fileURLToPath(new URL("./openspec-reconcile.ts", import.meta.url))),
    );
    git(["init", "-q", "-b", "base"]);
    git(["config", "user.email", "test@example.com"]);
    git(["config", "user.name", "Test"]);
    write("src/sample.test.ts", "import test from 'node:test';\ntest('sample', () => {});\n");
    write(
      "docs/audits/verification-gates/test-manifest.json",
      JSON.stringify({ tests: [{ file: "src/sample.test.ts", name: "sample" }], browser: [] }),
    );
    write("openspec/specs/game/sample/spec.md", "## Requirements\n\n### Requirement: One\n");
    write("docs/audits/openspec-archive-baseline.json", emptyBaseline);
    write("fixtures/conformance/openspec-archive-baseline.json", emptyBaseline);
    write("fixtures/conformance/archive-corrections.json", JSON.stringify({ corrections: [] }));
    write(
      "fixtures/conformance/archive-test-corrections.json",
      JSON.stringify({ corrections: [] }),
    );
    archive("2026-01-01-one", complete);
    git(["add", "."]);
    git(["commit", "-qm", "base"]);
    const base = git(["rev-parse", "HEAD"]);
    const built = run();
    assert.equal(built.status, 0, built.stderr);
    assert.equal(run(["--check", "--against", base]).status, 0);

    // A new archive without tasks.md is not exempt just because it is indexed.
    archive("2026-02-01-two", null);
    git(["add", "."]);
    git(["commit", "-qm", "incomplete archive"]);
    const buildTwo = run();
    assert.equal(buildTwo.status, 0, buildTwo.stderr);
    const noTasks = run(["--check", "--against", base]);
    assert.equal(noTasks.status, 1);
    assert.match(noTasks.stderr, /2026-02-01-two: archived change has no tasks\.md/);

    // A third, complete archive is indexed but not anchored.
    archive("2026-03-01-three", complete);
    git(["add", "."]);
    git(["commit", "-qm", "complete archive"]);
    const buildThree = run();
    assert.equal(buildThree.status, 0, buildThree.stderr);

    // A symbolic link inside an archived tree is not accepted as evidence.
    symlinkSync(
      "../../../../README.md",
      join(root, "openspec/changes/archive/2026-03-01-three/link"),
    );
    const linked = run();
    assert.equal(linked.status, 1);
    assert.match(linked.stderr, /symbolic link/);
    rmSync(join(root, "openspec/changes/archive/2026-03-01-three/link"));

    // Adding the name to the anchor fixture does not exempt it either.
    const anchorPath = "fixtures/conformance/openspec-archive-baseline.json";
    const anchor = JSON.parse(readFileSync(join(root, anchorPath), "utf8")) as {
      entries: Array<{ name: string; treeHash: string }>;
    };
    const index = JSON.parse(
      readFileSync(join(root, "docs/audits/openspec-archive-index.json"), "utf8"),
    ) as { entries: Array<{ name: string; treeHash: string }> };
    const three = index.entries.find((entry) => entry.name === "2026-03-01-three")!;
    write(anchorPath, JSON.stringify({ schemaVersion: 1, entries: [...anchor.entries, three] }));
    const grown = run(["--check", "--against", base]);
    assert.equal(grown.status, 1);
    assert.match(grown.stderr, /gained a record/);

    // Deleting the baseline record does not let the build re-pin a changed tree.
    const baselinePath = "docs/audits/openspec-archive-baseline.json";
    const baseline = JSON.parse(readFileSync(join(root, baselinePath), "utf8")) as {
      entries: Array<{ name: string; treeHash: string }>;
    };
    write(
      baselinePath,
      JSON.stringify({
        schemaVersion: 1,
        entries: baseline.entries.filter((entry) => entry.name !== "2026-03-01-three"),
      }),
    );
    const repin = run();
    assert.equal(repin.status, 1);
    assert.match(repin.stderr, /refusing to rewrite accepted archive records/);

    // A corrupted index is not silently rebuilt with new origins.
    write("docs/audits/openspec-archive-index.json", "not json\n");
    const malformed = run();
    assert.equal(malformed.status, 1);
    assert.match(malformed.stderr, /malformed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("the target tree, not a working anchor, exempts an introduced archive", () => {
  const root = mkdtempSync(join(tmpdir(), "archive-exempt-"));
  const git = (args: string[]): string =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const write = (file: string, content: string): void => {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  const run = (args: string[] = []) =>
    spawnSync(process.execPath, ["scripts/archive-index.ts", ...args], {
      cwd: root,
      encoding: "utf8",
    });
  const complete = "# Tasks\n\n- [x] 1.1 Done.\n\n## Evidence\n\n- RED: one\n- GREEN: two\n";
  const archive = (name: string, tasks: string | null): string => {
    const path = `openspec/changes/archive/${name}`;
    write(`${path}/proposal.md`, "Issue: #1\n");
    write(
      `${path}/specs/game/sample/spec.md`,
      "## ADDED Requirements\n\n### Requirement: One\n\n**Tests**: `src/sample.test.ts`\n",
    );
    if (tasks !== null) write(`${path}/tasks.md`, tasks);
    return path;
  };
  try {
    mkdirSync(join(root, "scripts"), { recursive: true });
    for (const file of ["archive-index.ts", "openspec-reconcile.ts"])
      writeFileSync(
        join(root, "scripts", file),
        readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url))),
      );
    git(["init", "-q", "-b", "dev"]);
    git(["config", "user.email", "test@example.com"]);
    git(["config", "user.name", "Test"]);
    write("src/sample.test.ts", "import test from 'node:test';\ntest('sample', () => {});\n");
    write(
      "docs/audits/verification-gates/test-manifest.json",
      JSON.stringify({ tests: [{ file: "src/sample.test.ts", name: "sample" }], browser: [] }),
    );
    write("openspec/specs/game/sample/spec.md", "## Requirements\n\n### Requirement: One\n");
    archive("2026-01-01-one", complete);
    git(["add", "."]);
    git(["commit", "-qm", "accepted archive"]);
    git(["branch", "base"]);

    // The worktree introduces a second archive and an anchor that names both.
    archive("2026-02-01-two", null);
    write(
      "docs/audits/openspec-archive-baseline.json",
      JSON.stringify({ schemaVersion: 1, entries: [] }),
    );
    write("fixtures/conformance/archive-corrections.json", JSON.stringify({ corrections: [] }));
    write("fixtures/conformance/archive-origins.json", JSON.stringify({ origins: [] }));
    write("fixtures/conformance/legacy-test-paths.json", JSON.stringify({ paths: [] }));
    git(["add", "."]);
    git(["commit", "-qm", "introduce two"]);
    const built = run();
    assert.equal(built.status, 0, built.stderr);
    const index = JSON.parse(
      readFileSync(join(root, "docs/audits/openspec-archive-index.json"), "utf8"),
    ) as { entries: Array<{ name: string; treeHash: string }> };
    write(
      "fixtures/conformance/openspec-archive-baseline.json",
      JSON.stringify({
        schemaVersion: 1,
        entries: index.entries.map((entry) => ({ name: entry.name, treeHash: entry.treeHash })),
      }),
    );
    const check = run(["--check", "--against", "base"]);
    assert.equal(check.status, 1, "the target has no anchor, so its tree defines the exemptions");
    assert.match(check.stderr, /2026-02-01-two: archived change has no tasks\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an origin record must match the index and carry a reason", () => {
  const entry = { ...row("2026-11-01-a"), commit: "a".repeat(40), date: "2026-11-01" };
  const record = {
    name: entry.name,
    commit: entry.commit,
    date: entry.date,
    reason: "squashed into dev",
  };
  assert.deepEqual(originRecordFailures([record], [entry]), []);
  assert.ok(
    originRecordFailures([{ ...record, commit: "f".repeat(40) }], [entry]).some((failure) =>
      failure.includes("differs from the index"),
    ),
  );
  assert.ok(
    originRecordFailures([{ ...record, reason: " " }], [entry]).some((failure) =>
      failure.includes("no reason"),
    ),
  );
  assert.ok(
    originRecordFailures([{ ...record, name: "2026-12-01-other" }], [entry]).some((failure) =>
      failure.includes("names no archived change"),
    ),
  );
  assert.ok(
    originRecordFailures([record, record], [entry]).some((failure) =>
      failure.includes("duplicate origin record"),
    ),
  );
  assert.equal(parseOrigins("not json"), null);
  assert.equal(parseOrigins(JSON.stringify({ origins: [{ name: "x" }] })), null);
  assert.equal(parseOrigins(JSON.stringify({ origins: [record] }))?.length, 1);
});

test("a legacy test path needs one reviewed mapping and must be used", () => {
  const root = mkdtempSync(join(tmpdir(), "legacy-paths-"));
  try {
    const entry = { ...row("2026-11-01-a"), tests: [] };
    mkdirSync(join(root, entry.path, "specs", "game", "sample"), { recursive: true });
    writeFileSync(
      join(root, entry.path, "specs", "game", "sample", "spec.md"),
      "## ADDED Requirements\n\n### Requirement: One\n\n**Tests**: `js/old.test.mjs`\n",
    );
    assert.deepEqual(historicalReferences(root, entry.path), ["js/old.test.mjs"]);
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "new.test.ts"), "");
    const mapping = { from: "js/old.test.mjs", to: "src/new.test.ts", reason: "renamed" };
    assert.deepEqual(legacyPathFailures(root, [entry], [mapping]), []);
    assert.ok(
      legacyPathFailures(root, [entry], []).some((failure) => failure.includes("has no mapping")),
    );
    assert.ok(
      legacyPathFailures(root, [entry], [{ ...mapping, reason: " " }]).some((failure) =>
        failure.includes("no reason"),
      ),
    );
    assert.ok(
      legacyPathFailures(root, [entry], [{ ...mapping, to: "src/gone.test.ts" }]).some((failure) =>
        failure.includes("not a regular file"),
      ),
    );
    assert.ok(
      legacyPathFailures(root, [entry], [mapping, { ...mapping, to: "src/new.test.ts" }]).some(
        (failure) => failure.includes("duplicate legacy test path"),
      ),
    );
    const unused = { from: "js/other.test.mjs", to: "src/new.test.ts", reason: "renamed" };
    assert.ok(
      legacyPathFailures(root, [entry], [mapping, unused]).some((failure) =>
        failure.includes("is not used"),
      ),
    );
    assert.equal(parseLegacyPaths("not json"), null);
    assert.equal(parseLegacyPaths(JSON.stringify({ paths: [{ from: 1 }] })), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("every archived change names a test and the anchor matches the target tree", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const index = JSON.parse(
    readFileSync(join(root, "docs/audits/openspec-archive-index.json"), "utf8"),
  ) as { entries: Array<{ name: string; tests?: string[] }> };
  assert.deepEqual(
    index.entries.filter((entry) => (entry.tests ?? []).length === 0).map((entry) => entry.name),
    [],
    "every archive carries at least one test reference",
  );
  const anchor = JSON.parse(
    readFileSync(join(root, "fixtures/conformance/openspec-archive-baseline.json"), "utf8"),
  ) as { entries: Array<{ name: string }> };
  const listing = execFileSync(
    "git",
    ["ls-tree", "-rz", "--name-only", "origin/dev", "--", "openspec/changes/archive"],
    { cwd: root, encoding: "utf8" },
  );
  const target = new Set(
    listing
      .split("\0")
      .filter(Boolean)
      .map((file) => file.split("/")[3])
      .filter((name) => name && name !== ".gitkeep"),
  );
  assert.deepEqual(
    new Set(anchor.entries.map((entry) => entry.name)),
    target,
    "the anchor records only the archives the target branch accepted",
  );
});

test("the archive check fails closed on an invalid target ref", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/archive-index.ts", "--check", "--against", "ref-that-does-not-exist-519"],
    { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cannot read the archive baseline at/);
});
