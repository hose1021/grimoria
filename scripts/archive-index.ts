#!/usr/bin/env node
// Builds the append-only index of archived OpenSpec changes. The archive stays
// in Git so a squash merge cannot orphan it; the index pins each change's
// introducing commit and file list.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface ArchiveEntry {
  name: string;
  commit: string;
  date: string;
  path: string;
  treeHash: string;
  issue?: string | null;
  tests?: string[];
}

export function entriesFrom(rows: readonly ArchiveEntry[]): ArchiveEntry[] {
  const names = new Set<string>();
  for (const row of rows) {
    if (names.has(row.name)) throw new Error(`duplicate archive entry: ${row.name}`);
    names.add(row.name);
  }
  return [...rows].sort((left, right) => left.name.localeCompare(right.name));
}

export function mergeEntries(
  existing: readonly ArchiveEntry[],
  fresh: readonly ArchiveEntry[],
): ArchiveEntry[] {
  const byName = new Map(fresh.map((entry) => [entry.name, entry]));
  for (const entry of existing)
    if (!byName.has(entry.name))
      throw new Error(`historical archive entry disappeared: ${entry.name}`);
  return entriesFrom([...byName.values()]);
}

function proposalIssue(root: string, path: string): string | null {
  const issue = /^Issue:\s*(?:#|https?:\/\/\S*\/issues\/)?(\d+)/m.exec(
    readFileSync(join(root, path, "proposal.md"), "utf8"),
  )?.[1];
  return issue ? `#${issue}` : null;
}

function build(root: string): ArchiveEntry[] {
  const dir = join(root, "openspec/changes/archive");
  return entriesFrom(
    readdirSync(dir)
      .filter((name) => statSync(join(dir, name)).isDirectory())
      .map((name) => {
        const path = `openspec/changes/archive/${name}`;
        const history = execFileSync(
          "git",
          ["log", "--format=%H %cs", "--diff-filter=A", "--", `${path}/proposal.md`],
          { cwd: root, encoding: "utf8" },
        )
          .trim()
          .split("\n")
          .filter(Boolean);
        const [commit = "", date = ""] = (history.at(-1) ?? "").split(" ");
        if (!commit) throw new Error(`no introducing commit for ${name}`);
        return {
          name,
          commit,
          date,
          path,
          treeHash: treeHash(root, path),
          issue: proposalIssue(root, path),
          tests: testReferences(root, path),
        };
      }),
  );
}

function isEntry(value: unknown): value is ArchiveEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.name === "string" &&
    typeof entry.commit === "string" &&
    typeof entry.date === "string" &&
    typeof entry.path === "string" &&
    typeof entry.treeHash === "string" &&
    (entry.issue === undefined || entry.issue === null || typeof entry.issue === "string") &&
    (entry.tests === undefined ||
      (Array.isArray(entry.tests) && entry.tests.every((file) => typeof file === "string"))) &&
    /^[0-9a-f]{64}$/.test(entry.treeHash)
  );
}

export function parseIndex(text: string): ArchiveEntry[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || !("entries" in parsed)) return null;
  const meta = parsed as { schemaVersion?: unknown; canonicalization?: unknown };
  if (meta.schemaVersion !== 2 || meta.canonicalization !== "text-lf-binary-raw-v1") return null;
  const entries = parsed.entries;
  if (!Array.isArray(entries) || !entries.every(isEntry)) return null;
  if (new Set(entries.map((entry) => entry.name)).size !== entries.length) return null;
  return entries;
}

function readIndex(path: string): ArchiveEntry[] | null {
  if (!existsSync(path)) return null;
  return parseIndex(readFileSync(path, "utf8"));
}

export function canonicalBytes(stored: Buffer): Buffer {
  if (stored.includes(0)) return stored;
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(stored);
  } catch {
    return stored;
  }
  return Buffer.from(decoded.replace(/\r\n/g, "\n"));
}

function treeHash(root: string, path: string, ref?: string): string {
  const files = new Map<string, () => Buffer>();
  if (ref) {
    const listing = execFileSync("git", ["ls-tree", "-rz", "--name-only", ref, "--", path], {
      cwd: root,
      encoding: "utf8",
    });
    for (const file of listing.split("\0").filter(Boolean))
      files.set(file, () =>
        execFileSync("git", ["show", `${ref}:${file}`], { cwd: root, maxBuffer: Infinity }),
      );
  } else {
    const walk = (dir: string): void => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const file = dir + "/" + entry.name;
        const absolute = join(root, file);
        if (entry.isDirectory()) walk(file);
        else if (entry.isSymbolicLink())
          files.set(file, () => readlinkSync(absolute, { encoding: "buffer" }));
        else if (entry.isFile()) files.set(file, () => readFileSync(absolute));
        else throw new Error(`unsupported archive entry: ${file}`);
      }
    };
    walk(path);
  }
  const hash = createHash("sha256");
  for (const file of [...files.keys()].sort()) {
    const stored = files.get(file)!();
    const bytes = canonicalBytes(stored);
    hash
      .update(file + "\0")
      .update(createHash("sha256").update(bytes).digest("hex"))
      .update("\n");
  }
  return hash.digest("hex");
}

function testReferences(root: string, path: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const next = dir + "/" + entry.name;
      if (entry.isDirectory()) walk(next);
      else if (entry.name === "spec.md") files.push(next);
    }
  };
  try {
    walk(`${path}/specs`);
  } catch {
    return [];
  }
  const refs = new Set<string>();
  for (const file of files) {
    const source = readFileSync(join(root, file), "utf8");
    for (const line of source.split("\n")) {
      if (!/\*\*Tests\*\*:/.test(line)) continue;
      for (const match of line.matchAll(/`([^`]+\.test\.ts)`/g)) refs.add(match[1]!);
      if (line.includes("browser-check.ts")) refs.add("scripts/browser-check.ts");
    }
  }
  return [...refs].sort();
}

export interface ArchiveNameHash {
  name: string;
  treeHash: string;
}

type Origin = Pick<ArchiveEntry, "commit" | "date">;

export function originFailures(
  entries: readonly ArchiveEntry[],
  firstAdd: (entry: ArchiveEntry) => Origin | null,
  acceptedOrigin: (entry: ArchiveEntry, first: Origin | null) => Origin | undefined,
): string[] {
  const failures: string[] = [];
  for (const entry of entries) {
    const first = firstAdd(entry);
    const expected = acceptedOrigin(entry, first) ?? first;
    if (!expected || expected.commit !== entry.commit || expected.date !== entry.date)
      failures.push(`${entry.name}: origin differs from its accepted record or first add`);
  }
  return failures;
}

function firstAdd(root: string, entry: ArchiveEntry): Origin | null {
  const lines = execFileSync(
    "git",
    ["log", "--format=%H %cs", "--diff-filter=A", "--", `${entry.path}/proposal.md`],
    { cwd: root, encoding: "utf8" },
  )
    .trim()
    .split("\n");
  const [commit, date] = (lines.at(-1) ?? "").split(" ");
  return commit && date ? { commit, date } : null;
}

export function archiveOriginFailures(
  root: string,
  entries: readonly ArchiveEntry[],
  ref?: string,
): string[] {
  const accepted = ref ? indexAt(root, ref) : undefined;
  const indexes = new Map<string, ReadonlyMap<string, ArchiveEntry>>();
  // The target branch wins when it already accepted the change. Otherwise the
  // index committed with the first add is the record: a squash merge rewrites
  // the introducing commit, but the tree it committed still names the reviewed
  // origin. A target without an index (a legacy main) is protected the same way.
  const acceptedOrigin = (entry: ArchiveEntry, first: Origin | null): Origin | undefined => {
    const target = accepted?.get(entry.name);
    if (target) return target;
    if (!first) return undefined;
    if (!indexes.has(first.commit)) indexes.set(first.commit, indexAt(root, first.commit));
    return indexes.get(first.commit)?.get(entry.name);
  };
  return originFailures(entries, (entry) => firstAdd(root, entry), acceptedOrigin);
}

function indexAt(root: string, ref: string): ReadonlyMap<string, ArchiveEntry> {
  const path = "docs/audits/openspec-archive-index.json";
  const listing = execFileSync("git", ["ls-tree", ref, "--", path], {
    cwd: root,
    encoding: "utf8",
  });
  if (!listing.trim()) return new Map();
  const index = parseIndex(
    execFileSync("git", ["show", `${ref}:${path}`], { cwd: root, encoding: "utf8" }),
  );
  if (!index) throw new Error(`invalid archive index at ${ref}`);
  return new Map(index.map((entry) => [entry.name, entry]));
}

export interface ArchiveCorrection {
  name: string;
  fromHash: string;
  toHash: string;
  reason: string;
}

export function applyCorrections(
  entries: readonly BaselineEntry[],
  corrections: readonly ArchiveCorrection[],
): BaselineEntry[] {
  return entries.map((entry) => {
    const correction = corrections.find(
      (candidate) => candidate.name === entry.name && candidate.fromHash === entry.treeHash,
    );
    return correction ? { name: entry.name, treeHash: correction.toHash } : entry;
  });
}

export function correctionFailures(
  corrections: readonly ArchiveCorrection[],
  index: readonly ArchiveEntry[],
): string[] {
  const failures: string[] = [];
  const names = new Set<string>();
  for (const correction of corrections) {
    if (names.has(correction.name))
      failures.push(`${correction.name}: only one correction per archive is allowed`);
    names.add(correction.name);
    if (!/^[0-9a-f]{64}$/.test(correction.fromHash) || !/^[0-9a-f]{64}$/.test(correction.toHash))
      failures.push(`${correction.name}: correction hashes are not SHA-256`);
    if (!correction.reason.trim()) failures.push(`${correction.name}: correction has no reason`);
    const current = index.find((entry) => entry.name === correction.name);
    if (!current || current.treeHash !== correction.toHash)
      failures.push(`${correction.name}: correction target is not the current tree`);
  }
  return failures;
}

export function provenanceFailures(entry: ArchiveEntry): string[] {
  const failures: string[] = [];
  if (entry.path !== `openspec/changes/archive/${entry.name}`)
    failures.push(`${entry.name}: canonical path does not match the archive name`);
  if (!/^[0-9]{4}-\d{2}-\d{2}$/.test(entry.date))
    failures.push(`${entry.name}: date is not an ISO day`);
  if (!/^[0-9a-f]{40}$/.test(entry.commit))
    failures.push(`${entry.name}: origin commit is not a full SHA-1`);
  return failures;
}

export function refArchiveFailures(
  accepted: readonly ArchiveNameHash[],
  index: readonly ArchiveEntry[],
): string[] {
  const byName = new Map(index.map((entry) => [entry.name, entry.treeHash]));
  const failures: string[] = [];
  for (const entry of accepted) {
    const hash = byName.get(entry.name);
    if (hash === undefined)
      failures.push(`${entry.name}: archived tree accepted on the target branch is gone`);
    else if (hash !== entry.treeHash)
      failures.push(`${entry.name}: archived tree changed since the target branch accepted it`);
  }
  return failures;
}

function refArchiveEntries(root: string, ref: string): ArchiveNameHash[] | null {
  let listing: string;
  try {
    listing = execFileSync(
      "git",
      ["ls-tree", "-rz", "--name-only", ref, "--", "openspec/changes/archive"],
      { cwd: root, encoding: "utf8" },
    );
  } catch {
    return null;
  }
  const names = new Set<string>();
  for (const file of listing.split("\0").filter(Boolean)) {
    const parts = file.split("/");
    const name = parts.length >= 5 ? parts[3] : undefined;
    if (name && name !== ".gitkeep") names.add(name);
  }
  const entries: ArchiveNameHash[] = [];
  for (const name of [...names].sort()) {
    entries.push({
      name,
      treeHash: treeHash(root, `openspec/changes/archive/${name}`, ref),
    });
  }
  return entries;
}

export interface ArchiveTestCorrection {
  archive: string;
  from: string;
  to: string;
  reason: string;
}

/**
 * Resolves the test files an archived delta spec names. A historical citation
 * may name a file that never existed or was renamed since; a reviewed record
 * maps it to the current asserting file without editing the archived tree.
 */
export function testReferenceFailures(
  entries: readonly ArchiveEntry[],
  corrections: readonly ArchiveTestCorrection[],
  exists: (path: string) => boolean,
): string[] {
  const failures: string[] = [];
  const byArchive = new Map(entries.map((entry) => [entry.name, new Set(entry.tests ?? [])]));
  const corrected = new Map<string, string>();
  for (const correction of corrections) {
    const key = correction.archive + "\0" + correction.from;
    if (corrected.has(key))
      failures.push(`${correction.archive}: duplicate correction for ${correction.from}`);
    const own = byArchive.get(correction.archive);
    if (!own) failures.push(`${correction.archive}: correction names no archived change`);
    else if (!own.has(correction.from))
      failures.push(`${correction.archive}: ${correction.from} is not an indexed test reference`);
    if (!correction.reason.trim())
      failures.push(`${correction.archive}: correction for ${correction.from} has no reason`);
    if (exists(correction.from))
      failures.push(`${correction.archive}: ${correction.from} exists; the correction is stale`);
    if (!exists(correction.to))
      failures.push(`${correction.archive}: correction target ${correction.to} is missing`);
    corrected.set(key, correction.to);
  }
  for (const entry of entries)
    for (const reference of entry.tests ?? [])
      if (!exists(reference) && !corrected.has(entry.name + "\0" + reference))
        failures.push(`${entry.name}: historical test reference ${reference} is dangling`);
  return failures;
}

export function parseTestCorrections(text: string): ArchiveTestCorrection[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as { corrections?: unknown };
  if (!Array.isArray(record.corrections)) return null;
  const corrections: ArchiveTestCorrection[] = [];
  for (const entry of record.corrections) {
    if (typeof entry !== "object" || entry === null) return null;
    const value = entry as ArchiveTestCorrection;
    if (
      typeof value.archive !== "string" ||
      typeof value.from !== "string" ||
      typeof value.to !== "string" ||
      typeof value.reason !== "string"
    )
      return null;
    corrections.push(value);
  }
  return corrections;
}

/**
 * An archived change outside the accepted anchor must be finished and carry
 * its RED/GREEN record. Entries the anchor accepted predate this gate and stay
 * as they are: history is evidence, not something to rewrite.
 */
export function archiveReadinessFailures(
  entries: readonly ArchiveEntry[],
  anchor: readonly BaselineEntry[],
  read: (path: string) => string | null,
): string[] {
  const accepted = new Set(anchor.map((entry) => entry.name));
  const failures: string[] = [];
  for (const entry of entries) {
    if (accepted.has(entry.name)) continue;
    const tasks = read(`${entry.path}/tasks.md`);
    if (tasks === null) {
      failures.push(`${entry.name}: archived change has no tasks.md`);
      continue;
    }
    const boxes = [...tasks.matchAll(/^- \[([ xX])\]/gm)].map((match) => match[1]);
    const open = boxes.filter((box) => box === " ").length;
    if (boxes.length === 0) failures.push(`${entry.name}: archived change has no checklist`);
    else if (open > 0) failures.push(`${entry.name}: archived change has ${open} open task(s)`);
    if (!/^- RED:/m.test(tasks) || !/^- GREEN:/m.test(tasks))
      failures.push(`${entry.name}: archived change has no RED/GREEN evidence`);
  }
  return failures;
}

export interface BaselineEntry {
  name: string;
  treeHash: string;
}

export function baselineFailures(
  baseline: readonly BaselineEntry[],
  index: readonly ArchiveEntry[],
): string[] {
  const byName = new Map(index.map((entry) => [entry.name, entry.treeHash]));
  return baseline
    .filter((entry) => byName.get(entry.name) !== entry.treeHash)
    .map((entry) => entry.name);
}

export function baselineCoverageFailures(
  baseline: readonly BaselineEntry[],
  index: readonly ArchiveEntry[],
): string[] {
  const failures: string[] = [];
  const indexNames = new Set(index.map((entry) => entry.name));
  const names = new Set<string>();
  for (const entry of baseline) {
    if (names.has(entry.name)) failures.push(`${entry.name}: duplicate baseline record`);
    names.add(entry.name);
  }
  for (const entry of baseline)
    if (!indexNames.has(entry.name))
      failures.push(`${entry.name}: baseline record has no index entry`);
  for (const entry of index)
    if (!names.has(entry.name)) failures.push(`${entry.name}: tree is not pinned by the baseline`);
  return failures;
}

export function parseBaseline(text: string): BaselineEntry[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as { schemaVersion?: unknown; entries?: unknown };
  if (record.schemaVersion !== 1 || !Array.isArray(record.entries)) return null;
  const entries: BaselineEntry[] = [];
  for (const entry of record.entries) {
    if (typeof entry !== "object" || entry === null) return null;
    const value = entry as BaselineEntry;
    if (typeof value.name !== "string" || !/^[0-9]{4}-/.test(value.name)) return null;
    if (typeof value.treeHash !== "string" || !/^[0-9a-f]{64}$/.test(value.treeHash)) return null;
    entries.push({ name: value.name, treeHash: value.treeHash });
  }
  return entries;
}

export function historicalFailures(
  anchor: readonly BaselineEntry[],
  index: readonly ArchiveEntry[],
): string[] {
  const byName = new Map(index.map((entry) => [entry.name, entry.treeHash]));
  const failures: string[] = [];
  for (const entry of anchor) {
    const hash = byName.get(entry.name);
    if (hash === undefined)
      failures.push(`${entry.name}: archived tree removed since the original baseline`);
    else if (hash !== entry.treeHash)
      failures.push(`${entry.name}: tree changed since the original baseline`);
  }
  return failures;
}

function refBaseline(root: string, ref: string): BaselineEntry[] | "absent" | null {
  try {
    execFileSync("git", ["rev-parse", "--verify", ref], { cwd: root, stdio: "ignore" });
  } catch {
    return null;
  }
  let listing: string;
  try {
    listing = execFileSync(
      "git",
      ["ls-tree", ref, "--", "docs/audits/openspec-archive-baseline.json"],
      { cwd: root, encoding: "utf8" },
    );
  } catch {
    return null;
  }
  if (!listing.trim()) return "absent";
  try {
    const text = execFileSync(
      "git",
      ["show", `${ref}:docs/audits/openspec-archive-baseline.json`],
      { cwd: root, encoding: "utf8" },
    );
    return parseBaseline(text);
  } catch {
    return null;
  }
}

function readBaseline(path: string): BaselineEntry[] | null {
  if (!existsSync(path)) return null;
  return parseBaseline(readFileSync(path, "utf8"));
}

export function appendBaseline(
  baseline: readonly BaselineEntry[],
  entries: readonly ArchiveEntry[],
): BaselineEntry[] {
  const known = new Set(baseline.map((entry) => entry.name));
  const added = entries
    .filter((entry) => !known.has(entry.name))
    .map((entry) => ({ name: entry.name, treeHash: entry.treeHash }));
  return added.length ? [...baseline, ...added] : [...baseline];
}

function verifyFiles(root: string, entries: readonly ArchiveEntry[]): void {
  for (const entry of entries) {
    if (
      entry.path !== `openspec/changes/archive/${entry.name}` ||
      /[/\\]/.test(entry.name) ||
      entry.name === ".."
    )
      throw new Error(`invalid archive path: ${entry.path}`);
    if (!existsSync(join(root, entry.path)) || treeHash(root, entry.path) !== entry.treeHash)
      throw new Error(`archived tree changed or missing: ${entry.path}`);
    if (entry.issue !== proposalIssue(root, entry.path))
      throw new Error(`archive issue differs from proposal: ${entry.path}`);
    const tests = testReferences(root, entry.path);
    if (JSON.stringify(tests) !== JSON.stringify(entry.tests ?? []))
      throw new Error(`archive test references differ from the delta specs: ${entry.path}`);
  }
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = join(root, "docs/audits/openspec-archive-index.json");
  const existing = readIndex(out);
  if (process.argv.includes("--check")) {
    if (!existing) {
      console.error("openspec-archive-index.json is missing; run node scripts/archive-index.ts");
      process.exitCode = 1;
      return;
    }
    verifyFiles(root, existing);
    const baselinePath = join(root, "docs/audits/openspec-archive-baseline.json");
    if (!existsSync(baselinePath)) {
      console.error("openspec-archive-baseline.json is missing; archived evidence is unpinned");
      process.exitCode = 1;
      return;
    }
    const baseline = readBaseline(baselinePath);
    if (baseline === null) {
      console.error("openspec-archive-baseline.json is malformed; pinned records are lost");
      process.exitCode = 1;
      return;
    }
    const correctionsPath = join(root, "fixtures/conformance/archive-corrections.json");
    const corrections = existsSync(correctionsPath)
      ? (JSON.parse(readFileSync(correctionsPath, "utf8")) as { corrections: ArchiveCorrection[] })
          .corrections
      : [];
    const correctedBaseline = applyCorrections(baseline, corrections);
    const refIndex = process.argv.indexOf("--against");
    const ref = refIndex >= 0 ? process.argv[refIndex + 1] : process.env.ARCHIVE_BASELINE_REF;
    if (refIndex >= 0 && !ref) throw new Error("--against needs a git ref");
    if (ref) {
      try {
        execFileSync("git", ["rev-parse", "--verify", ref], { cwd: root, stdio: "ignore" });
      } catch {
        console.error(`cannot read the archive baseline at ${ref}; fetch the target branch`);
        process.exitCode = 1;
        return;
      }
    }
    const changed = [
      ...existing.flatMap((entry) => provenanceFailures(entry)),
      ...archiveOriginFailures(root, existing, ref),
      ...baselineFailures(correctedBaseline, existing),
      ...baselineCoverageFailures(correctedBaseline, existing),
      ...correctionFailures(corrections, existing),
    ];
    if (changed.length) {
      console.error(`archived trees changed or unpinned: ${changed.join("; ")}`);
      process.exitCode = 1;
      return;
    }
    const anchorPath = join(root, "fixtures/conformance/openspec-archive-baseline.json");
    const anchor = existsSync(anchorPath) ? readBaseline(anchorPath) : null;
    if (anchor === null) {
      console.error("the original archive baseline fixture is missing or malformed");
      process.exitCode = 1;
      return;
    }
    if (ref) {
      const accepted = refBaseline(root, ref);
      if (accepted === null) {
        console.error(`cannot read the archive baseline at ${ref}; fetch the target branch`);
        process.exitCode = 1;
        return;
      }
      if (accepted !== "absent" && accepted.length === 0) {
        console.error(`the archive baseline at ${ref} is unreadable`);
        process.exitCode = 1;
        return;
      }
      let removed: string[] = [];
      if (accepted === "absent") {
        const tree = refArchiveEntries(root, ref);
        if (tree === null) {
          console.error(`cannot read the archive tree at ${ref}`);
          process.exitCode = 1;
          return;
        }
        removed = refArchiveFailures(applyCorrections(tree, corrections), existing);
      } else {
        removed = historicalFailures(applyCorrections(accepted, corrections), existing);
      }
      if (removed.length) {
        console.error(
          `archives accepted on ${ref} were removed or rewritten: ${removed.join("; ")}`,
        );
        process.exitCode = 1;
        return;
      }
    }
    const historical = historicalFailures(applyCorrections(anchor, corrections), existing);
    if (historical.length) {
      console.error(
        `archive evidence changed since the original baseline: ${historical.join("; ")}`,
      );
      process.exitCode = 1;
      return;
    }
    const dir = join(root, "openspec/changes/archive");
    const indexed = new Set(existing.map((entry) => entry.path));
    const unindexed = readdirSync(dir)
      .filter((name) => statSync(join(dir, name)).isDirectory())
      .map((name) => `openspec/changes/archive/${name}`)
      .filter((path) => !indexed.has(path));
    if (unindexed.length) {
      console.error(
        `openspec-archive-index.json is stale; run node scripts/archive-index.ts: ${unindexed.join(", ")}`,
      );
      process.exitCode = 1;
      return;
    }
    const testCorrectionsPath = join(root, "fixtures/conformance/archive-test-corrections.json");
    const testCorrections = existsSync(testCorrectionsPath)
      ? parseTestCorrections(readFileSync(testCorrectionsPath, "utf8"))
      : [];
    if (testCorrections === null) {
      console.error("archive-test-corrections.json is malformed");
      process.exitCode = 1;
      return;
    }
    const references = testReferenceFailures(existing, testCorrections, (path) =>
      existsSync(join(root, path)),
    );
    const readiness = archiveReadinessFailures(existing, anchor, (path) => {
      const absolute = join(root, path);
      return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
    });
    if (references.length || readiness.length) {
      console.error([...references, ...readiness].join("; "));
      process.exitCode = 1;
      return;
    }
    console.log(`Archive index is current: ${existing.length} change(s).`);
    return;
  }
  const fresh = build(root);
  const mergedRaw = existing ? mergeEntries(existing, fresh) : fresh;
  const merged = mergedRaw.map((entry) => {
    const prior = existing?.find((candidate) => candidate.name === entry.name);
    if (!prior) return entry;
    return { ...entry, commit: prior.commit, date: prior.date };
  });
  verifyFiles(root, merged);
  const baselinePath = join(root, "docs/audits/openspec-archive-baseline.json");
  const baseline = readBaseline(baselinePath);
  if (baseline === null) {
    console.error("openspec-archive-baseline.json is missing or malformed; refusing to accept");
    process.exitCode = 1;
    return;
  }
  // Accept a new archive by appending its record. An existing record is never
  // rewritten: a changed tree needs a reviewed correction entry.
  const appended = appendBaseline(baseline, merged);
  if (appended.length !== baseline.length)
    writeFileSync(
      baselinePath,
      JSON.stringify({ schemaVersion: 1, entries: appended }, null, 2) + "\n",
    );
  writeFileSync(
    out,
    JSON.stringify(
      {
        schemaVersion: 2,
        canonicalization: "text-lf-binary-raw-v1",
        entries: merged,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Wrote ${merged.length} archive entr(ies) to docs/audits/openspec-archive-index.json.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
