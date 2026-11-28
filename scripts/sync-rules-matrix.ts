#!/usr/bin/env node
// Checks that docs/rules-matrix.md agrees with the canonical registry: every
// one of the 172 identifiers appears in exactly one row, no row carries an
// unknown identifier, and the requirement column equals the registry text.
// The matrix stays a human view and the only place that pins wiki revisions.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { identifiersIn } from "./rule-traceability.ts";

export function registryCitations(
  root: string,
): Map<string, Array<{ file: string; name: string }>> {
  const out = new Map<string, Array<{ file: string; name: string }>>();
  const add = (file: string): void => {
    const doc = JSON.parse(readFileSync(file, "utf8")) as {
      rules: Array<{ id: string; assertingTests: Array<{ file: string; name: string }> }>;
    };
    for (const rule of doc.rules)
      out.set(
        rule.id,
        [...rule.assertingTests].sort((left, right) =>
          (left.file + left.name).localeCompare(right.file + right.name),
        ),
      );
  };
  for (const name of readdirSync(join(root, "rules", "roles")).sort())
    if (name.endsWith(".json")) add(join(root, "rules", "roles", name));
  add(join(root, "rules", "shared.json"));
  return out;
}

function citationKey(citation: { file: string; name: string }): string {
  return citation.file + "\0" + citation.name;
}

function formatCitations(citations: Array<{ file: string; name: string }>): string {
  return citations.map((citation) => `\`${citation.file}\` "${citation.name}"`).join("; ");
}

export function registryRequirements(root: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const name of readdirSync(join(root, "rules", "roles")).sort()) {
    if (!name.endsWith(".json")) continue;
    const doc = JSON.parse(readFileSync(join(root, "rules", "roles", name), "utf8")) as {
      rules: Array<{ id: string; requirement: string }>;
    };
    for (const rule of doc.rules) out.set(rule.id, rule.requirement);
  }
  const shared = JSON.parse(readFileSync(join(root, "rules", "shared.json"), "utf8")) as {
    rules: Array<{ id: string; requirement: string }>;
  };
  for (const rule of shared.rules) out.set(rule.id, rule.requirement);
  return out;
}

export function matrixSyncFailures(
  matrix: string,
  requirements: Map<string, string>,
  citations: Map<string, Array<{ file: string; name: string }>> = new Map(),
): string[] {
  const cellsOf = (line: string): string[] | null => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
    return trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
  };
  const failures: string[] = [];
  const seen = new Map<string, number>();
  for (const cells of matrix.split("\n").map(cellsOf)) {
    if (cells === null) continue;
    for (const id of identifiersIn(cells[0] ?? "")) {
      seen.set(id, (seen.get(id) ?? 0) + 1);
      const expected = requirements.get(id);
      if (expected === undefined) {
        failures.push(`${id}: matrix row has no registry rule`);
        continue;
      }
      const actual = id.startsWith("SYS-")
        ? (cells[0] ?? "")
            .replace(id, "")
            .replace(/^[\s—–:-]+/, "")
            .trim()
        : cells[1];
      if (actual !== expected)
        failures.push(`${id}: matrix text "${actual}" != registry "${expected}"`);
      const expectedCitations = citations.get(id);
      if (expectedCitations !== undefined) {
        const rowCell = id.startsWith("SYS-") ? cells[cells.length - 2] : cells[cells.length - 2];
        const actualKeys = [...(rowCell ?? "").matchAll(/`([^`]+)`\s+"([^"]+)"/g)]
          .map((match) => match[1] + "\0" + match[2])
          .sort();
        const expectedKeys = expectedCitations.map(citationKey).sort();
        if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys))
          failures.push(`${id}: matrix citations differ from the registry`);
      }
    }
  }
  for (const [id, count] of seen)
    if (count > 1) failures.push(`${id}: ${count} matrix rows carry the identifier`);
  for (const id of requirements.keys())
    if (!seen.has(id)) failures.push(`${id}: no matrix row carries the identifier`);
  return failures;
}

export function syncMatrix(
  matrix: string,
  requirements: Map<string, string>,
  citations: Map<string, Array<{ file: string; name: string }>> = new Map(),
): { text: string; changed: number } {
  let changed = 0;
  const lines = matrix.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return line;
    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    const ids = identifiersIn(cells[0] ?? "");
    if (ids.length !== 1) return line;
    const id = ids[0]!;
    const expected = requirements.get(id);
    if (expected === undefined) return line;
    const actual = id.startsWith("SYS-")
      ? (cells[0] ?? "")
          .replace(id, "")
          .replace(/^[\s—–:-]+/, "")
          .trim()
      : cells[1];
    let mutated = false;
    if (actual !== expected) {
      if (id.startsWith("SYS-")) cells[0] = `${id} ${expected}`;
      else cells[1] = expected;
      mutated = true;
    }
    const expectedCitations = citations.get(id);
    if (expectedCitations !== undefined) {
      const rowCell = cells[cells.length - 2] ?? "";
      const actualKeys = [...rowCell.matchAll(/`([^`]+)`\s+"([^"]+)"/g)]
        .map((match) => match[1] + "\0" + match[2])
        .sort();
      const expectedKeys = expectedCitations.map(citationKey).sort();
      if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
        cells[cells.length - 2] = formatCitations(expectedCitations);
        mutated = true;
      }
    }
    if (!mutated) return line;
    changed++;
    return `| ${cells.join(" | ")} |`;
  });
  return { text: lines.join("\n"), changed };
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const matrix = readFileSync(join(root, "docs", "rules-matrix.md"), "utf8");
  const requirements = registryRequirements(root);
  const citations = registryCitations(root);
  if (process.argv.includes("--write")) {
    const { text, changed } = syncMatrix(matrix, requirements, citations);
    if (changed) writeFileSync(join(root, "docs", "rules-matrix.md"), text);
    console.log(`Rule matrix updated: ${changed} row(s).`);
    return;
  }
  const failures = matrixSyncFailures(matrix, requirements, citations);
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    console.error(`Rule matrix is out of sync: ${failures.length} problem(s).`);
    process.exitCode = 1;
    return;
  }
  console.log("Rule matrix matches the registry.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
