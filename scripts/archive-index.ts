#!/usr/bin/env node
// Builds the immutable index of archived OpenSpec changes before they leave the
// working tree. Every entry names the commit that introduced the change.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface ArchiveEntry {
  name: string;
  commit: string;
  date: string;
  path: string;
}

export function entriesFrom(rows: readonly ArchiveEntry[]): ArchiveEntry[] {
  const names = new Set<string>();
  for (const row of rows) {
    if (names.has(row.name)) throw new Error(`duplicate archive entry: ${row.name}`);
    names.add(row.name);
  }
  return [...rows].sort((left, right) => left.name.localeCompare(right.name));
}

function build(root: string): ArchiveEntry[] {
  const dir = join(root, "openspec/changes/archive");
  const rows = readdirSync(dir)
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
      execFileSync("git", ["cat-file", "-e", `${commit}:${path}/proposal.md`], { cwd: root });
      return { name, commit, date, path };
    });
  return entriesFrom(rows);
}

function verifyIndex(root: string, entries: readonly ArchiveEntry[]): void {
  for (const entry of entries)
    execFileSync("git", ["cat-file", "-e", `${entry.commit}:${entry.path}/proposal.md`], {
      cwd: root,
    });
}

function isIndex(value: unknown): value is { entries: ArchiveEntry[] } {
  if (typeof value !== "object" || value === null || !("entries" in value)) return false;
  const entries = value.entries;
  return (
    Array.isArray(entries) &&
    entries.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        "commit" in entry &&
        "date" in entry &&
        "path" in entry &&
        typeof entry.name === "string" &&
        typeof entry.commit === "string" &&
        typeof entry.date === "string" &&
        typeof entry.path === "string",
    )
  );
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = join(root, "docs/audits/openspec-archive-index.json");
  const exists = readdirSync(root + "/openspec/changes").includes("archive");
  if (process.argv.includes("--check")) {
    const current = readFileSync(out, "utf8");
    if (!exists) {
      const parsed: unknown = JSON.parse(current);
      if (!isIndex(parsed)) throw new Error("archive index has an unexpected shape");
      verifyIndex(root, parsed.entries);
      console.log("Archive index verified against git history.");
      return;
    }
    const entries = build(root);
    if (current !== JSON.stringify({ schemaVersion: 1, entries }, null, 2) + "\n") {
      console.error("openspec-archive-index.json is stale; run node scripts/archive-index.ts");
      process.exitCode = 1;
      return;
    }
    console.log(`Archive index is current: ${entries.length} change(s).`);
    return;
  }
  const entries = build(root);
  writeFileSync(out, JSON.stringify({ schemaVersion: 1, entries }, null, 2) + "\n");
  console.log(
    `Wrote ${entries.length} archive entr(ies) to docs/audits/openspec-archive-index.json.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
