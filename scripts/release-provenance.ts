#!/usr/bin/env node
// Pre-release check: every archive the target branch already holds must have a
// reviewed origin record when its target first add differs from the index.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  originRecordFailures,
  parseIndex,
  readOrigins,
  type ArchiveEntry,
} from "./archive-index.ts";

const INDEX_FILE = "docs/audits/openspec-archive-index.json";

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function targetFirstAdd(
  root: string,
  targetRef: string,
  entry: ArchiveEntry,
): { commit: string; date: string } | null {
  const output = git(root, [
    "log",
    "--format=%H %cs",
    "--diff-filter=A",
    targetRef,
    "--",
    `${entry.path}/proposal.md`,
  ]);
  const last = output.split("\n").filter(Boolean).at(-1);
  if (!last) return null;
  const [commit, date] = last.split(" ");
  return commit && date ? { commit, date } : null;
}

export function provenanceFailures(root: string, targetRef: string): string[] {
  const index = parseIndex(readFileSync(join(root, INDEX_FILE), "utf8"));
  if (!index) return [`${INDEX_FILE} is malformed`];
  const origins = readOrigins(root);
  if (origins === null) return ["archive-origins.json is malformed"];
  const failures = originRecordFailures(origins, index);
  const records = new Map(origins.map((origin) => [origin.name, origin]));
  for (const entry of index) {
    const target = targetFirstAdd(root, targetRef, entry);
    if (target && target.commit === entry.commit && target.date === entry.date) continue;
    const record = records.get(entry.name);
    if (!record) {
      failures.push(
        `${entry.name}: no reviewed origin for the target first add ${target?.commit ?? "absent"}`,
      );
      continue;
    }
    if (record.commit !== entry.commit || record.date !== entry.date)
      failures.push(`${entry.name}: the reviewed origin differs from the index`);
  }
  return failures;
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const targetRef = process.argv[2] ?? "origin/main";
  try {
    execFileSync("git", ["rev-parse", "--verify", targetRef], { cwd: root, stdio: "ignore" });
  } catch {
    console.error(`cannot read the target ref ${targetRef}`);
    process.exitCode = 1;
    return;
  }
  const failures = provenanceFailures(root, targetRef);
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    console.error(
      `Release provenance preflight failed: ${failures.length} archive(s) need a reviewed origin.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`Release provenance preflight passed against ${targetRef}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
