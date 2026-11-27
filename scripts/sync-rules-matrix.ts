#!/usr/bin/env node
// Checks that every rule row in docs/rules-matrix.md carries the requirement
// text of its canonical JSON record. The matrix is a human view plus the only
// place that pins wiki revisions; the requirement column is generated from
// rules/*.json and must not drift.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RuleRequirement {
  id: string;
  requirement: string;
}

export function registryRequirements(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const dirs = [join(root, "rules", "roles")];
  for (const dir of dirs)
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith(".json")) continue;
      const doc = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
        rules: RuleRequirement[];
      };
      for (const rule of doc.rules) out.set(rule.id, rule.requirement);
    }
  const shared = JSON.parse(readFileSync(join(root, "rules", "shared.json"), "utf8")) as {
    rules: RuleRequirement[];
  };
  for (const rule of shared.rules) out.set(rule.id, rule.requirement);
  return out;
}

export function labelMismatches(matrix: string, requirements: Map<string, string>): string[] {
  const failures: string[] = [];
  for (const line of matrix.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;
    for (const match of cells[0]!.matchAll(/`((?:TB|BMR|SNV|SYS)-[A-Z0-9]+-\d\d)`/g)) {
      const id = match[1]!;
      const expected = requirements.get(id);
      if (expected !== undefined && cells[1] !== expected)
        failures.push(`${id}: matrix label "${cells[1]}" != registry "${expected}"`);
    }
  }
  return failures;
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const matrix = readFileSync(join(root, "docs", "rules-matrix.md"), "utf8");
  const failures = labelMismatches(matrix, registryRequirements(root));
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    console.error(`Rule matrix labels are stale: ${failures.length} row(s).`);
    process.exitCode = 1;
    return;
  }
  console.log("Rule matrix labels match the registry.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
