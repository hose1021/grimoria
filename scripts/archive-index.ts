#!/usr/bin/env node
// Builds the append-only index of archived OpenSpec changes. The archive stays
// in Git so a squash merge cannot orphan it; the index pins each change's
// introducing commit and file list.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
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
  for (const entry of existing) {
    const current = byName.get(entry.name);
    if (!current) throw new Error(`historical archive entry disappeared: ${entry.name}`);
    byName.set(entry.name, { ...current, commit: entry.commit, date: entry.date });
  }
  return entriesFrom([...byName.values()]);
}

function listFiles(base: string, dir: string = base): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(base, full));
    else out.push(relative(base, full).split("\\").join("/"));
  }
  return out.sort();
}

function build(root: string): ArchiveEntry[] {
  const dir = join(root, "openspec/changes/archive");
  return entriesFrom(
    readdirSync(dir)
      .filter((name) => statSync(join(dir, name)).isDirectory())
      .map((name) => {
        const path = `openspec/changes/archive/${name}`;
        const record = execFileSync(
          "git",
          ["log", "-1", "--format=%H %cs", "--diff-filter=A", "--", `${path}/proposal.md`],
          { cwd: root, encoding: "utf8" },
        ).trim();
        const [commit = "", date = ""] = record.split(" ");
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
  const hash = createHash("sha256");
  for (const file of listFiles(root, join(root, path)))
    hash
      .update(file + "\0")
      .update(
        createHash("sha256")
          .update(readFileSync(join(root, file)))
          .digest("hex"),
      )
      .update("\n");
  return hash.digest("hex");
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
