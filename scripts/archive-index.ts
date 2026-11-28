#!/usr/bin/env node
// Builds the append-only index of archived OpenSpec changes. The archive stays
// in Git so a squash merge cannot orphan it; the index pins each change's
// introducing commit and file list.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normativeRequirementBodies,
  parseRequirements,
  type RequirementRef,
} from "./openspec-reconcile.ts";

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
  const legacyPaths = readLegacyPaths(root);
  if (legacyPaths === null) throw new Error("legacy-test-paths.json is malformed");
  const legacy = new Map(legacyPaths.map((path) => [path.from, path.to]));
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
          tests: testReferences(root, path, legacy),
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

const LEGACY_PATHS_FILE = "fixtures/conformance/legacy-test-paths.json";
const ORIGINS_FILE = "fixtures/conformance/archive-origins.json";
const CONTENT_RECORDS_FILE = "fixtures/conformance/archive-content-corrections.json";

function isTestReference(token: string): boolean {
  if (/\s/.test(token) || token.includes("*")) return false;
  return (
    /\.(test\.ts|test\.mjs|test-d\.ts|test-d\.mts)$/.test(token) ||
    token === "scripts/browser-check.ts" ||
    token === "scripts/browser-check.mjs" ||
    token === "scripts/openspec-check.ts" ||
    token === "scripts/openspec-check.mjs"
  );
}

/**
 * Every test reference an archived change names. Delta-spec `**Tests**` lines
 * come first; a change that names none falls back to its task and design
 * evidence. Historical `.mjs` and type-test paths are returned as written.
 */
export function historicalReferences(root: string, path: string): string[] {
  const refs = new Set<string>();
  const collect = (text: string, filter: (line: string) => boolean): void => {
    for (const line of text.split("\n"))
      if (filter(line))
        for (const match of line.matchAll(/`([^`]+)`/g))
          for (const part of match[1]!.split(/\s+/)) if (isTestReference(part)) refs.add(part);
  };
  const specFiles: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const next = dir + "/" + entry.name;
      if (entry.isDirectory()) walk(next);
      else if (entry.name === "spec.md") specFiles.push(next);
    }
  };
  try {
    walk(`${path}/specs`);
  } catch {
    // A change without delta specs uses its task evidence below.
  }
  for (const file of specFiles)
    collect(readFileSync(join(root, file), "utf8"), (line) => /\*\*Tests\*\*:/.test(line));
  if (!refs.size)
    for (const file of ["tasks.md", "design.md"]) {
      const absolute = join(root, path, file);
      if (existsSync(absolute)) collect(readFileSync(absolute, "utf8"), () => true);
    }
  return [...refs].sort();
}

export interface LegacyTestPath {
  from: string;
  to: string;
  reason: string;
}

export function parseLegacyPaths(text: string): LegacyTestPath[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const paths = (parsed as { paths?: unknown }).paths;
  if (!Array.isArray(paths)) return null;
  for (const entry of paths) {
    if (typeof entry !== "object" || entry === null) return null;
    const value = entry as LegacyTestPath;
    if (
      typeof value.from !== "string" ||
      typeof value.to !== "string" ||
      typeof value.reason !== "string"
    )
      return null;
  }
  return paths as LegacyTestPath[];
}

function readLegacyPaths(root: string): LegacyTestPath[] | null {
  const path = join(root, LEGACY_PATHS_FILE);
  if (!existsSync(path)) return [];
  return parseLegacyPaths(readFileSync(path, "utf8"));
}

export function isRegularFile(root: string, path: string): boolean {
  if (path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) return false;
  try {
    const stat = lstatSync(join(root, path));
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * A historical test path that no longer exists is resolved once by a reviewed
 * record. Every referenced legacy path needs a mapping, and every mapping must
 * point at a regular asserting file and still be used.
 */
export function legacyPathFailures(
  root: string,
  entries: readonly ArchiveEntry[],
  paths: readonly LegacyTestPath[],
): string[] {
  const failures: string[] = [];
  const byFrom = new Map<string, LegacyTestPath>();
  for (const path of paths) {
    if (byFrom.has(path.from)) failures.push(`${path.from}: duplicate legacy test path`);
    byFrom.set(path.from, path);
    if (!path.reason.trim()) failures.push(`${path.from}: legacy test path has no reason`);
    if (!isTestReference(path.to))
      failures.push(`${path.from}: mapping target ${path.to} is not an asserting test file`);
    else if (!isRegularFile(root, path.to))
      failures.push(`${path.from}: mapping target ${path.to} is not a regular file`);
  }
  const used = new Set<string>();
  for (const entry of entries)
    for (const ref of historicalReferences(root, entry.path)) {
      const mapping = byFrom.get(ref);
      if (mapping) {
        used.add(ref);
        continue;
      }
      if (!isCurrentTestReference(ref))
        failures.push(`${entry.name}: historical test reference ${ref} has no mapping`);
    }
  for (const path of paths)
    if (!used.has(path.from)) failures.push(`${path.from}: legacy test path is not used`);
  return failures;
}

export interface ArchiveOrigin {
  name: string;
  commit: string;
  date: string;
  reason: string;
}

export function parseOrigins(text: string): ArchiveOrigin[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const origins = (parsed as { origins?: unknown }).origins;
  if (!Array.isArray(origins)) return null;
  for (const entry of origins) {
    if (typeof entry !== "object" || entry === null) return null;
    const value = entry as ArchiveOrigin;
    if (
      typeof value.name !== "string" ||
      typeof value.commit !== "string" ||
      typeof value.date !== "string" ||
      typeof value.reason !== "string"
    )
      return null;
  }
  return origins as ArchiveOrigin[];
}

export function readOrigins(root: string): ArchiveOrigin[] | null {
  const path = join(root, ORIGINS_FILE);
  if (!existsSync(path)) return [];
  return parseOrigins(readFileSync(path, "utf8"));
}

export interface ArchiveContentRecord {
  archive: string;
  requirement: string;
  reason: string;
}

export function parseContentRecords(text: string): ArchiveContentRecord[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const records = (parsed as { records?: unknown }).records;
  if (!Array.isArray(records)) return null;
  for (const entry of records) {
    if (typeof entry !== "object" || entry === null) return null;
    const value = entry as ArchiveContentRecord;
    if (
      typeof value.archive !== "string" ||
      typeof value.requirement !== "string" ||
      typeof value.reason !== "string"
    )
      return null;
  }
  return records as ArchiveContentRecord[];
}

export function readContentRecords(root: string): ArchiveContentRecord[] | null {
  const path = join(root, CONTENT_RECORDS_FILE);
  if (!existsSync(path)) return [];
  return parseContentRecords(readFileSync(path, "utf8"));
}

/**
 * A reviewed record names a squash-integrated origin that the branch history
 * can no longer prove. It must match the indexed origin exactly and carry a
 * reason; a fabricated origin has no record.
 */
export function originRecordFailures(
  records: readonly ArchiveOrigin[],
  entries: readonly ArchiveEntry[],
): string[] {
  const failures: string[] = [];
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.name)) failures.push(`${record.name}: duplicate origin record`);
    seen.add(record.name);
    const entry = byName.get(record.name);
    if (!entry) failures.push(`${record.name}: origin record names no archived change`);
    else if (entry.commit !== record.commit || entry.date !== record.date)
      failures.push(`${record.name}: origin record differs from the index`);
    if (!/^[0-9a-f]{40}$/.test(record.commit))
      failures.push(`${record.name}: origin record commit is not a full SHA-1`);
    if (!/^[0-9]{4}-\d{2}-\d{2}$/.test(record.date))
      failures.push(`${record.name}: origin record date is not an ISO day`);
    if (!record.reason.trim()) failures.push(`${record.name}: origin record has no reason`);
  }
  return failures;
}

function isCurrentTestReference(ref: string): boolean {
  return (
    ref.endsWith(".test.ts") ||
    ref.endsWith(".test-d.ts") ||
    ref === "scripts/browser-check.ts" ||
    ref === "scripts/openspec-check.ts"
  );
}

function testReferences(root: string, path: string, legacy: ReadonlyMap<string, string>): string[] {
  const refs = historicalReferences(root, path);
  const out = new Set<string>();
  for (const ref of refs) {
    const mapped = legacy.get(ref);
    if (mapped) out.add(mapped);
    else if (isCurrentTestReference(ref)) out.add(ref);
    else out.add(ref);
  }
  return [...out].sort();
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
  const records = new Map((readOrigins(root) ?? []).map((origin) => [origin.name, origin]));
  // The target branch wins when it accepted the change. Otherwise the origin is
  // accepted only when it is the first add itself, or when a reviewed record
  // names the squash-integrated origin: a record written in the same commit as
  // the archive is self-attestation, not evidence.
  const acceptedOrigin = (entry: ArchiveEntry, first: Origin | null): Origin | undefined => {
    const target = accepted?.get(entry.name);
    if (target) return target;
    if (first && entry.commit === first.commit && entry.date === first.date) return first;
    const record = records.get(entry.name);
    if (record && record.commit === entry.commit && record.date === entry.date)
      return { commit: record.commit, date: record.date };
    return undefined;
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

function manifestApplies(path: string): boolean {
  return path.endsWith(".test.ts") || path === "scripts/browser-check.ts";
}

export type PathState = "file" | "missing" | "other";

/**
 * Resolves the test files an archived delta spec names. A historical citation
 * may name a file that never existed or was renamed since; a reviewed record
 * maps it to the current asserting file without editing the archived tree.
 * Every resolved reference must be a regular file, and when the test manifest
 * is supplied it must also be an indexed test.
 */
export function testReferenceFailures(
  entries: readonly ArchiveEntry[],
  corrections: readonly ArchiveTestCorrection[],
  state: (path: string) => PathState,
  known?: (path: string) => boolean,
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
    if (state(correction.from) === "file")
      failures.push(`${correction.archive}: ${correction.from} exists; the correction is stale`);
    if (state(correction.to) !== "file")
      failures.push(
        `${correction.archive}: correction target ${correction.to} is not a regular file`,
      );
    else if (!isTestReference(correction.to))
      failures.push(
        `${correction.archive}: correction target ${correction.to} is not an asserting test file`,
      );
    else if (known && manifestApplies(correction.to) && !known(correction.to))
      failures.push(
        `${correction.archive}: correction target ${correction.to} is not an indexed test`,
      );
    corrected.set(key, correction.to);
  }
  for (const entry of entries)
    for (const reference of entry.tests ?? []) {
      const resolved = corrected.get(entry.name + "\0" + reference) ?? reference;
      const status = state(resolved);
      if (status === "missing")
        failures.push(`${entry.name}: historical test reference ${resolved} is dangling`);
      else if (status === "other")
        failures.push(`${entry.name}: test reference ${resolved} is not a regular file`);
      else if (known && manifestApplies(resolved) && !known(resolved))
        failures.push(`${entry.name}: test reference ${resolved} is not an indexed test`);
    }
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
 * An archived change outside the accepted anchor must be finished, carry real
 * RED/GREEN evidence, and have every delta requirement applied to the baseline
 * specs. The normative requirement text, without its citations, must match the
 * baseline at the transition; a body the baseline legitimately refined after
 * the sync carries a reviewed record. Entries the anchor accepted predate this
 * gate and stay as they are: history is evidence, not something to rewrite.
 */
export function archiveReadinessFailures(
  entries: readonly ArchiveEntry[],
  anchor: readonly BaselineEntry[],
  read: (path: string) => string | null,
  list: (dir: string) => string[],
  baseline: (capability: string) => string | null,
  contentRecords: readonly ArchiveContentRecord[] = [],
): string[] {
  const accepted = new Set(anchor.map((entry) => entry.name));
  const failures: string[] = [];
  const recordKey = (archive: string, requirement: string): string => archive + "\0" + requirement;
  const records = new Map<string, ArchiveContentRecord>();
  for (const record of contentRecords) {
    const key = recordKey(record.archive, record.requirement);
    if (records.has(key))
      failures.push(`${record.archive}: duplicate content record for "${record.requirement}"`);
    records.set(key, record);
    if (!record.reason.trim())
      failures.push(`${record.archive}: content record for "${record.requirement}" has no reason`);
  }
  const seen = new Set<string>();
  const used = new Set<string>();
  const stale = new Set<string>();
  for (const entry of entries) {
    if (accepted.has(entry.name)) continue;
    const tasks = read(`${entry.path}/tasks.md`);
    if (tasks === null) {
      failures.push(`${entry.name}: archived change has no tasks.md`);
      continue;
    }
    const boxes = [...tasks.matchAll(/^\s*- \[([ xX])\]/gm)].map((match) => match[1]);
    const open = boxes.filter((box) => box === " ").length;
    if (boxes.length === 0) failures.push(`${entry.name}: archived change has no checklist`);
    else if (open > 0) failures.push(`${entry.name}: archived change has ${open} open task(s)`);
    if (!/^\s*- RED:[ \t]*\S/m.test(tasks) || !/^\s*- GREEN:[ \t]*\S/m.test(tasks))
      failures.push(`${entry.name}: archived change has no non-empty RED/GREEN evidence`);
    const specs = list(`${entry.path}/specs`).filter((file) => file.endsWith("spec.md"));
    if (specs.length === 0) failures.push(`${entry.name}: archived change has no delta spec`);
    for (const spec of specs) {
      const text = read(spec);
      if (text === null) {
        failures.push(`${entry.name}: delta spec ${spec} is unreadable`);
        continue;
      }
      let rows: RequirementRef[];
      try {
        rows = parseRequirements(relative(entry.path, spec), text, baseline);
      } catch (error) {
        failures.push(`${entry.name}: delta spec ${spec} is unreadable: ${String(error)}`);
        continue;
      }
      if (rows.length === 0) failures.push(`${entry.name}: delta spec ${spec} has no requirements`);
      const deltaBodies = normativeRequirementBodies(text);
      for (const row of rows) {
        if (row.operation === "RENAMED")
          failures.push(`${entry.name}: RENAMED requirement "${row.name}" is not supported`);
        else if (row.operation === "REMOVED") {
          if (row.present)
            failures.push(
              `${entry.name}: removed requirement "${row.name}" is still in the baseline`,
            );
        } else if (!row.present) {
          failures.push(`${entry.name}: requirement "${row.name}" is not applied to the baseline`);
        } else {
          const key = recordKey(entry.name, row.name);
          seen.add(key);
          const baseText = baseline(row.capability);
          const baseBody =
            baseText === null ? "" : (normativeRequirementBodies(baseText).get(row.name) ?? "");
          const body = deltaBodies.get(row.name) ?? "";
          if (body === baseBody) {
            if (records.has(key)) stale.add(key);
          } else if (records.has(key)) {
            used.add(key);
          } else {
            failures.push(
              `${entry.name}: requirement "${row.name}" content differs from the baseline`,
            );
          }
        }
      }
    }
  }
  for (const [key, record] of records) {
    if (used.has(key)) continue;
    if (stale.has(key)) {
      failures.push(
        `${record.archive}: content record for "${record.requirement}" is stale; the body matches`,
      );
      continue;
    }
    if (!seen.has(key))
      failures.push(
        `${record.archive}: content record "${record.requirement}" names no archived requirement`,
      );
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

const BASELINE_FILE = "docs/audits/openspec-archive-baseline.json";
const ANCHOR_FILE = "fixtures/conformance/openspec-archive-baseline.json";
const CORRECTIONS_FILE = "fixtures/conformance/archive-corrections.json";

/**
 * The original anchor is immutable: the target branch's copy must keep exactly
 * its names and hashes. A new record belongs to the current baseline, never to
 * the anchor, so a new archive cannot exempt itself from the readiness gate.
 */
export function anchorFailures(
  accepted: readonly BaselineEntry[],
  current: readonly BaselineEntry[],
): string[] {
  const failures: string[] = [];
  const byName = new Map(current.map((entry) => [entry.name, entry.treeHash]));
  for (const entry of accepted) {
    const hash = byName.get(entry.name);
    if (hash === undefined) failures.push(`${entry.name}: the original anchor lost a record`);
    else if (hash !== entry.treeHash)
      failures.push(`${entry.name}: the original anchor changed its record`);
  }
  const names = new Set(accepted.map((entry) => entry.name));
  for (const entry of current)
    if (!names.has(entry.name))
      failures.push(`${entry.name}: the original anchor gained a record the target does not hold`);
  return failures;
}

export function readCorrections(path: string): ArchiveCorrection[] | null {
  if (!existsSync(path)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const corrections = (parsed as { corrections?: unknown }).corrections;
  if (!Array.isArray(corrections)) return null;
  for (const correction of corrections) {
    if (typeof correction !== "object" || correction === null) return null;
    const value = correction as ArchiveCorrection;
    if (
      typeof value.name !== "string" ||
      typeof value.fromHash !== "string" ||
      typeof value.toHash !== "string" ||
      typeof value.reason !== "string"
    )
      return null;
  }
  return corrections as ArchiveCorrection[];
}

function refBaseline(
  root: string,
  ref: string,
  path: string = BASELINE_FILE,
): BaselineEntry[] | "absent" | null {
  try {
    execFileSync("git", ["rev-parse", "--verify", ref], { cwd: root, stdio: "ignore" });
  } catch {
    return null;
  }
  let listing: string;
  try {
    listing = execFileSync("git", ["ls-tree", ref, "--", path], {
      cwd: root,
      encoding: "utf8",
    });
  } catch {
    return null;
  }
  if (!listing.trim()) return "absent";
  try {
    const text = execFileSync("git", ["show", `${ref}:${path}`], {
      cwd: root,
      encoding: "utf8",
    });
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

/**
 * Build mode may append a new archive, never accept a changed one. A dropped
 * baseline record or a changed hash needs a reviewed correction entry, so the
 * build refuses before it rewrites the index.
 */
export function repinFailures(
  baseline: readonly BaselineEntry[],
  existing: readonly ArchiveEntry[],
  corrections: readonly ArchiveCorrection[],
): string[] {
  const corrected = applyCorrections(baseline, corrections);
  const pinned = new Map(corrected.map((entry) => [entry.name, entry.treeHash]));
  const failures: string[] = [];
  for (const entry of existing) {
    const hash = pinned.get(entry.name);
    if (hash === undefined) failures.push(entry.name);
    else if (hash !== entry.treeHash) failures.push(entry.name);
  }
  return failures;
}

function assertNoSymlinks(root: string, path: string): void {
  for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
    const child = `${path}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`archived tree contains a symbolic link: ${child}`);
    if (entry.isDirectory()) assertNoSymlinks(root, child);
  }
}

function verifyFiles(root: string, entries: readonly ArchiveEntry[]): void {
  const legacyPaths = readLegacyPaths(root);
  if (legacyPaths === null) throw new Error("legacy-test-paths.json is malformed");
  const legacy = new Map(legacyPaths.map((path) => [path.from, path.to]));
  for (const entry of entries) {
    if (
      entry.path !== `openspec/changes/archive/${entry.name}` ||
      /[/\\]/.test(entry.name) ||
      entry.name === ".."
    )
      throw new Error(`invalid archive path: ${entry.path}`);
    if (!existsSync(join(root, entry.path)))
      throw new Error(`archived tree changed or missing: ${entry.path}`);
    assertNoSymlinks(root, entry.path);
    if (treeHash(root, entry.path) !== entry.treeHash)
      throw new Error(`archived tree changed or missing: ${entry.path}`);
    if (entry.issue !== proposalIssue(root, entry.path))
      throw new Error(`archive issue differs from proposal: ${entry.path}`);
    const tests = testReferences(root, entry.path, legacy);
    if (JSON.stringify(tests) !== JSON.stringify(entry.tests ?? []))
      throw new Error(`archive test references differ from the delta specs: ${entry.path}`);
  }
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = join(root, "docs/audits/openspec-archive-index.json");
  const exists = existsSync(out);
  const existing = readIndex(out);
  if (process.argv.includes("--check")) {
    if (!existing) {
      console.error(
        exists
          ? "openspec-archive-index.json is malformed; restore it instead of rebuilding the origins"
          : "openspec-archive-index.json is missing; run node scripts/archive-index.ts",
      );
      process.exitCode = 1;
      return;
    }
    verifyFiles(root, existing);
    const baselinePath = join(root, BASELINE_FILE);
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
    const corrections = readCorrections(join(root, CORRECTIONS_FILE));
    if (corrections === null) {
      console.error("archive-corrections.json is malformed");
      process.exitCode = 1;
      return;
    }
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
    let targetAnchor: BaselineEntry[] | "absent" | null = null;
    if (ref) {
      targetAnchor = refBaseline(root, ref, ANCHOR_FILE);
      if (targetAnchor === null) {
        console.error(`cannot read the original archive anchor at ${ref}; fetch the target branch`);
        process.exitCode = 1;
        return;
      }
      if (targetAnchor !== "absent") {
        const anchorDiff = anchorFailures(
          applyCorrections(targetAnchor, corrections),
          applyCorrections(anchor, corrections),
        );
        if (anchorDiff.length) {
          console.error(`the original anchor gained or changed a record: ${anchorDiff.join("; ")}`);
          process.exitCode = 1;
          return;
        }
      }
    }
    if (ref) {
      const accepted = refBaseline(root, ref);
      if (accepted === null) {
        console.error(`cannot read the archive baseline at ${ref}; fetch the target branch`);
        process.exitCode = 1;
        return;
      }
      // An empty accepted baseline is a valid "no archive yet" state; only a
      // missing or malformed file is unreadable.
      let removed: string[];
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
    const legacyPaths = readLegacyPaths(root);
    if (legacyPaths === null) {
      console.error("legacy-test-paths.json is malformed");
      process.exitCode = 1;
      return;
    }
    const origins = readOrigins(root);
    if (origins === null) {
      console.error("archive-origins.json is malformed");
      process.exitCode = 1;
      return;
    }
    const contentRecords = readContentRecords(root);
    if (contentRecords === null) {
      console.error("archive-content-corrections.json is malformed");
      process.exitCode = 1;
      return;
    }
    const manifestPath = join(root, "docs/audits/verification-gates/test-manifest.json");
    if (!existsSync(manifestPath)) {
      console.error("test-manifest.json is missing; test references cannot be verified");
      process.exitCode = 1;
      return;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      tests: Array<{ file: string }>;
      browser: Array<{ file: string }>;
    };
    const known = new Set([...manifest.tests, ...manifest.browser].map((entry) => entry.file));
    const state = (path: string): PathState => {
      if (path.startsWith("/") || path.includes("\\") || path.split("/").includes(".."))
        return "other";
      try {
        const stat = lstatSync(join(root, path));
        return stat.isFile() && !stat.isSymbolicLink() ? "file" : "other";
      } catch {
        return "missing";
      }
    };
    const readAny = (path: string): string | null => {
      const absolute = join(root, path);
      return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
    };
    const list = (dir: string): string[] => {
      const out: string[] = [];
      const walk = (relativeDir: string): void => {
        const absolute = join(root, relativeDir);
        if (!existsSync(absolute)) return;
        for (const entry of readdirSync(absolute, { withFileTypes: true })) {
          const child = `${relativeDir}/${entry.name}`;
          if (entry.isDirectory()) walk(child);
          else out.push(child);
        }
      };
      walk(dir);
      return out.sort();
    };
    const baselineSpec = (capability: string): string | null => {
      const path = join(root, "openspec/specs", capability, "spec.md");
      return existsSync(path) ? readFileSync(path, "utf8") : null;
    };
    const references = [
      ...testReferenceFailures(existing, testCorrections, state, (path) => known.has(path)),
      ...legacyPathFailures(root, existing, legacyPaths),
      ...existing
        .filter((entry) => (entry.tests ?? []).length === 0)
        .map((entry) => `${entry.name}: archived change has no test reference`),
      ...originRecordFailures(origins, existing),
    ];
    // The historical exemption comes from the target: its anchor when one
    // exists, otherwise its actual archive tree. A working anchor cannot
    // introduce a name the target never accepted.
    let exemptions: readonly BaselineEntry[] = anchor;
    if (targetAnchor === "absent") {
      const tree = refArchiveEntries(root, ref!);
      if (tree === null) {
        console.error(`cannot read the archive tree at ${ref}`);
        process.exitCode = 1;
        return;
      }
      exemptions = tree;
    } else if (targetAnchor !== null) {
      exemptions = targetAnchor;
    }
    const readiness = archiveReadinessFailures(
      existing,
      exemptions,
      readAny,
      list,
      baselineSpec,
      contentRecords,
    );
    if (references.length || readiness.length) {
      console.error([...references, ...readiness].join("; "));
      process.exitCode = 1;
      return;
    }
    console.log(`Archive index is current: ${existing.length} change(s).`);
    return;
  }
  if (exists && !existing) {
    console.error(
      "openspec-archive-index.json is malformed; restore it instead of rebuilding the origins",
    );
    process.exitCode = 1;
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
  const baselinePath = join(root, BASELINE_FILE);
  const baseline = readBaseline(baselinePath);
  if (baseline === null) {
    console.error("openspec-archive-baseline.json is missing or malformed; refusing to accept");
    process.exitCode = 1;
    return;
  }
  if (existing) {
    const corrections = readCorrections(join(root, CORRECTIONS_FILE));
    if (corrections === null) {
      console.error("archive-corrections.json is malformed; refusing to accept");
      process.exitCode = 1;
      return;
    }
    const rewritten = repinFailures(baseline, existing, corrections);
    if (rewritten.length) {
      console.error(
        `refusing to rewrite accepted archive records: ${rewritten.join("; ")}; record a reviewed correction in ${CORRECTIONS_FILE}`,
      );
      process.exitCode = 1;
      return;
    }
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
