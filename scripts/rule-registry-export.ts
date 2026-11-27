#!/usr/bin/env node
// Exports the legacy rule documents into the language-neutral JSON registry.
// The exporter is deterministic: same inputs, same bytes.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRuleDoc } from "./rule-traceability.ts";

export function requirementLabels(matrix: string): Map<string, string> {
  const labels = new Map<string, string>();
  for (const line of matrix.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const sys = /^(SYS-[A-Z0-9]+-\d\d)\s+(.+)$/.exec(cells[0]);
    if (sys && !labels.has(sys[1])) {
      labels.set(sys[1], sys[2].trim());
      continue;
    }
    for (const match of cells[0].matchAll(/`((?:TB|BMR|SNV|SYS)-[A-Z0-9]+-\d\d)`/g)) {
      if (!labels.has(match[1])) labels.set(match[1], cells[1]);
    }
  }
  return labels;
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const labels = requirementLabels(readFileSync(join(root, "docs/rules-matrix.md"), "utf8"));
  const rolesDir = join(root, "src/core/roles");
  const outDir = join(root, "rules/roles");
  mkdirSync(outDir, { recursive: true });
  let count = 0;
  for (const name of readdirSync(rolesDir).sort()) {
    const rulePath = join(rolesDir, name, "rule.md");
    try {
      if (!statSync(rulePath).isFile()) continue;
    } catch {
      continue;
    }
    const doc = parseRuleDoc(readFileSync(rulePath, "utf8"));
    if (!doc.rules.length) continue;
    const rules = doc.rules.map((rule) => {
      const requirement = labels.get(rule.id);
      if (!requirement) throw new Error(`${name}: no matrix requirement for ${rule.id}`);
      return {
        id: rule.id,
        roleId: name,
        edition: doc.edition ?? "shared",
        level: rule.level,
        revision: rule.revision,
        requirement,
        assertingTests: rule.citations,
      };
    });
    writeFileSync(
      join(outDir, `${name}.json`),
      JSON.stringify({ schemaVersion: 1, rules }, null, 2) + "\n",
    );
    count += rules.length;
  }
  const shared = parseRuleDoc(readFileSync(join(root, "docs/rules-shared.md"), "utf8"));
  const sharedRules = shared.rules.map((rule) => {
    const requirement = labels.get(rule.id);
    if (!requirement) throw new Error(`shared: no matrix requirement for ${rule.id}`);
    return {
      id: rule.id,
      edition: "shared",
      level: rule.level,
      revision: rule.revision,
      requirement,
      assertingTests: rule.citations,
    };
  });
  writeFileSync(
    join(root, "rules/shared.json"),
    JSON.stringify({ schemaVersion: 1, rules: sharedRules }, null, 2) + "\n",
  );
  count += sharedRules.length;
  console.log(
    `Exported ${count} rule(s) from ${readdirSync(outDir).length} role file(s) and the shared document.`,
  );
}

main();
