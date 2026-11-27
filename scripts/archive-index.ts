#!/usr/bin/env node
// Builds the append-only index of archived OpenSpec changes. The archive stays
// in Git so a squash merge cannot orphan it; the index pins each change's
// introducing commit and file list.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface ArchiveEntry {
  name: string;
  commit: string;
  date: string;
  path: string;
  treeHash: string;
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
        return { name, commit, date, path, treeHash: treeHash(root, path) };
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
    /^[0-9a-f]{64}$/.test(entry.treeHash)
  );
}

function readIndex(path: string): ArchiveEntry[] | null {
  if (!existsSync(path)) return null;
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("entries" in parsed)) return null;
  const entries = parsed.entries;
  if (!Array.isArray(entries) || !entries.every(isEntry)) return null;
  return entries;
}

function treeHash(root: string, path: string): string {
  const files = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "--", path], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const bytes = execFileSync("git", ["show", `HEAD:${file}`], { cwd: root });
    hash
      .update(file + "\0")
      .update(createHash("sha256").update(bytes).digest("hex"))
      .update("\n");
  }
  return hash.digest("hex");
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

function verifyFiles(root: string, entries: readonly ArchiveEntry[]): void {
  for (const entry of entries)
    if (!existsSync(join(root, entry.path)) || treeHash(root, entry.path) !== entry.treeHash)
      throw new Error(`archived tree changed or missing: ${entry.path}`);
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
    const changed = [
      ...baselineFailures(baseline, existing),
      ...baselineCoverageFailures(baseline, existing),
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
    const refIndex = process.argv.indexOf("--against");
    const ref = refIndex >= 0 ? process.argv[refIndex + 1] : process.env.ARCHIVE_BASELINE_REF;
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
      const removed = historicalFailures(accepted === "absent" ? [] : accepted, existing);
      if (removed.length) {
        console.error(
          `archives accepted on ${ref} were removed or rewritten: ${removed.join("; ")}`,
        );
        process.exitCode = 1;
        return;
      }
    }
    const historical = historicalFailures(anchor, existing);
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
    console.log(`Archive index is current: ${existing.length} change(s).`);
    return;
  }
  const fresh = build(root);
  const merged = existing ? mergeEntries(existing, fresh) : fresh;
  verifyFiles(root, merged);
  writeFileSync(out, JSON.stringify({ schemaVersion: 1, entries: merged }, null, 2) + "\n");
  console.log(
    `Wrote ${merged.length} archive entr(ies) to docs/audits/openspec-archive-index.json.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
