#!/usr/bin/env node
// Stable index of executable tests. The manifest is committed so a test cannot
// disappear silently: every manifest entry must exist in the current tree.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { testDeclarations } from "./source-text.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = join(ROOT, "docs", "audits", "verification-gates", "test-manifest.json");
const ROOTS = [join(ROOT, "src"), join(ROOT, "scripts")];

export interface TestEntry {
  key: string;
  file: string;
  name: string;
  /** Present only when the declaration cannot run. */
  skipped?: true;
}

export interface Manifest {
  version: 1;
  tests: TestEntry[];
  browser: TestEntry[];
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      out.push(...walk(path));
    } else if (/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

function browserNames(): string[] {
  const path = join(ROOT, "scripts", "browser-check.ts");
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  const names = new Set<string>();
  // `fullChecks` runs its scenarios under `phase("name")`; a contract names one
  // of those as evidence, so the index must contain them.
  for (const match of text.matchAll(/\bphase\(\s*"([^"]+)"\s*\)/g)) names.add(match[1]);
  const block =
    /const focusedChecks: Record<string, \(\) => Promise<void>> = \{([\s\S]*?)\n\};/.exec(text);
  if (block) {
    for (const match of block[1].matchAll(/^\s*"([^"]+)":/gm)) names.add(match[1]);
  }
  return [...names].sort();
}

export function build(): Manifest {
  const tests: TestEntry[] = [];
  for (const root of ROOTS) {
    if (!existsSync(root)) continue;
    for (const file of walk(root)) {
      const rel = relative(ROOT, file).split("\\").join("/");
      for (const declaration of testDeclarations(readFileSync(file, "utf8"))) {
        tests.push({
          key: rel + "::" + declaration.name,
          file: rel,
          name: declaration.name,
          ...(declaration.skipped ? { skipped: true as const } : {}),
        });
      }
    }
  }
  tests.sort((a, b) => a.key.localeCompare(b.key));
  const browser = browserNames().map((name) => ({
    key: "scripts/browser-check.ts::" + name,
    file: "scripts/browser-check.ts",
    name,
  }));
  return { version: 1, tests, browser };
}

function main(): void {
  const manifest = build();
  const text = JSON.stringify(manifest, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (!existsSync(OUT)) {
      console.error("test-manifest.json is missing; run node scripts/verification/test-index.ts");
      process.exit(1);
    }
    const current = JSON.parse(readFileSync(OUT, "utf8")) as Manifest;
    const currentKeys = new Set(current.tests.map((entry) => entry.key));
    const nowKeys = new Set(manifest.tests.map((entry) => entry.key));
    const removed = [...currentKeys].filter((key) => !nowKeys.has(key));
    const added = [...nowKeys].filter((key) => !currentKeys.has(key));
    if (removed.length) {
      console.error("Tests were removed without updating the manifest:");
      for (const key of removed.slice(0, 20)) console.error("  - " + key);
      process.exit(1);
    }
    if (added.length) {
      console.error("The manifest is stale; run node scripts/verification/test-index.ts");
      for (const key of added.slice(0, 20)) console.error("  - " + key);
      process.exit(1);
    }
    if (JSON.stringify(current) !== JSON.stringify(manifest)) {
      console.error("The manifest is stale; run node scripts/verification/test-index.ts");
      process.exit(1);
    }
    console.log(
      `Test manifest is current: ${manifest.tests.length} node tests, ${manifest.browser.length} browser cases.`,
    );
    return;
  }
  writeFileSync(OUT, text);
  console.log(
    `Wrote ${OUT}: ${manifest.tests.length} node tests, ${manifest.browser.length} browser cases.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
