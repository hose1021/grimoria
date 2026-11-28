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
  "src/infrastructure/storage/",
  "src/infrastructure/offline/",
  "src/ui/screens/player",
  "src/ui/screens/secrets",
  "src/ui/screens/seat",
  "src/ui/screens/public",
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
  "tsconfig",
  "rules/",
  ".github/",
  "openspec/changes/",
  "openspec/config.yaml",
  "openspec/specs/workflow/",
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
const R0 = [
  "README.md",
  "CHANGELOG.md",
  "DECISIONS.md",
  "PRODUCT.md",
  "DESIGN.md",
  "docs/",
  "openspec/specs/",
];

function matches(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

function tierOf(path: string): Tier {
  if (matches(path, R3)) return "R3";
  if (matches(path, R2)) return "R2";
  if (matches(path, R1)) return "R1";
  if (matches(path, R0)) return "R0";
  return "R3";
}

export function classify(paths: readonly string[]): Tier {
  let highest: Tier = "R0";
  for (const path of paths) {
    const tier = tierOf(path);
    if (ORDER.indexOf(tier) > ORDER.indexOf(highest)) highest = tier;
  }
  return highest;
}

function evidenceFailures(tier: Tier, body: string): string[] {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => /^Evidence:\s*$/.test(line));
  let chunk = "";
  if (start >= 0) {
    for (let index = start + 1; index < lines.length; index += 1) {
      if (lines[index]!.startsWith("## ")) break;
      chunk += lines[index] + "\n";
    }
  }
  const substantive = /^\s*[-*]\s+\S/m.test(chunk);
  if (tier === "R0") {
    if (!substantive && !/^## Verification\b/m.test(body))
      return ["R0 needs at least one Evidence bullet or a Verification section"];
    return [];
  }
  if (!substantive) return [`${tier} needs at least one concrete Evidence bullet`];
  if (tier === "R1") {
    if (!/\.test\.ts|npm (?:run )?\S+|node --test|browser-check/i.test(chunk))
      return ["R1 needs regression or characterization evidence naming a test or command"];
    return [];
  }
  if (tier === "R2") {
    const failures: string[] = [];
    if (!/\b(?:TB|BMR|SNV|SYS)-[A-Z0-9]+-\d\d\b/.test(body))
      failures.push("R2 needs a stable rule identifier");
    if (!/\.test\.ts/.test(body)) failures.push("R2 needs the asserting test file");

    if (!/https:\/\/wiki\.bloodontheclocktower\.com\/[^\s)\]]*[?&]oldid=\d+\b/i.test(body))
      failures.push("R2 needs the official source link with its pinned revision");
    if (!/^\s*[-*]\s*RED:[ \t]*\S/im.test(body)) failures.push("R2 needs RED evidence");
    if (!/^\s*[-*]\s*GREEN:[ \t]*\S/im.test(body)) failures.push("R2 needs GREEN evidence");
    return failures;
  }
  return [];
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
  errors.push(...evidenceFailures(computed, body));
  if (declared && ORDER.indexOf(declared) > ORDER.indexOf(computed))
    for (const error of evidenceFailures(declared, body))
      if (!errors.includes(error)) errors.push(error);
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
