#!/usr/bin/env node
// Classifies a change by the files it touches and rejects a silent downgrade.
// Risk is decided by the diff, never by the label the author chose.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type Tier = "R0" | "R1" | "R2" | "R3";
const ORDER: readonly Tier[] = ["R0", "R1", "R2", "R3"];

const R3 = [
  "src/core/engine/",
  "src/core/model/",
  "src/core/commands/",
  "src/entry/store.ts",
  "src/infrastructure/offline/",
  "src/ui/screens/player-projection.ts",
  "src/ui/screens/player.tsx",
  "scripts/verification/",
  "scripts/rule-registry.ts",
  "scripts/check-risk-tier.ts",
  "scripts/openspec-check.ts",
  "scripts/check-acceptance.ts",
  "scripts/archive-index.ts",
  "scripts/sync-rules-matrix.ts",
  "scripts/check-official.ts",
  "scripts/check-types-policy.ts",
  "scripts/check-risk-artifacts.ts",
  "contracts/",
  "rules/",
  ".github/",
  "openspec/",
  "AGENTS.md",
  "docs/official/",
  "docs/audits/",
  "docs/rules-",
  "package.json",
  "package-lock.json",
  "src/entry/",
  "src/application/store/",
  "src/entry/store.ts",
  "scripts/rule-traceability.ts",
  "scripts/openspec-reconcile.ts",
  "fixtures/conformance/",
  "scripts/build-",
  "scripts/fetch-official.ts",
  "scripts/official-pins.ts",
];
const R2 = ["src/core/roles/", "src/application/"];
const R1 = ["src/ui/", "css/"];

function matches(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

export function classify(paths: readonly string[]): Tier {
  if (paths.some((path) => matches(path, R3))) return "R3";
  if (paths.some((path) => matches(path, R2))) return "R2";
  if (paths.some((path) => matches(path, R1))) return "R1";
  return "R0";
}

export function checkRisk(
  body: string,
  paths: readonly string[],
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const computed = classify(paths);
  const declared = /^Risk:\s*(R[0-3])\s*$/m.exec(body)?.[1] as Tier | undefined;
  if (!/^Issue:\s*(#\d+|https?:\/\/\S+)/m.test(body)) errors.push("PR body has no Issue line");
  if (!declared) errors.push("PR body has no Risk: R0-R3 line");
  else if (ORDER.indexOf(declared) < ORDER.indexOf(computed))
    errors.push(`declared ${declared} is lower than the diff's ${computed}`);
  if (!/^Evidence:/m.test(body) && !/^## Verification\b/m.test(body))
    errors.push("PR body has no Evidence line or Verification section");
  return { ok: errors.length === 0, errors };
}

function main(): void {
  const bodyPath = process.argv[2];
  const filesPath = process.argv[3];
  if (!bodyPath || !filesPath) {
    console.error("usage: check-risk-tier.ts <pr-body> <changed-files>");
    process.exitCode = 2;
    return;
  }
  const result = checkRisk(
    readFileSync(bodyPath, "utf8"),
    readFileSync(filesPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log("Risk tier check passed.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
