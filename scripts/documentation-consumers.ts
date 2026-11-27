#!/usr/bin/env node
// Read-only map of the committed files that read each generated artifact.
// Phase 3 needs the consumer list before any derived view moves out of Git.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface Artifact {
  artifact: string;
  generator: string;
  consumers: string[];
}

export const ARTIFACTS: ReadonlyArray<readonly [string, string]> = [
  ["docs/audits/verification-gates/test-manifest.json", "scripts/verification/test-index.ts"],
  ["docs/audits/verification-gates/traceability.json", "scripts/verification/build-trace.ts"],
  ["reports/uncovered.json", "scripts/verification/build-uncovered.ts"],
  [
    "docs/audits/verification-gates/traceability-matrix.md",
    "scripts/verification/render-matrix.ts",
  ],
  [
    "docs/audits/verification-gates/ui-contract-test-matrix.md",
    "scripts/verification/render-matrix.ts",
  ],
  ["docs/audits/release-readiness.md", "scripts/build-readiness-matrix.ts"],
  ["docs/role-ownership.md", "scripts/role-ownership.ts"],
  ["public/assets/data/reference.json", "scripts/build-reference.ts"],
];

export function scan(
  files: ReadonlyArray<{ path: string; text: string }>,
  artifact: string,
): string[] {
  return files
    .filter((file) => file.path !== artifact && !file.path.startsWith("docs/reference/"))
    .filter((file) => !file.text.includes("\0"))
    .filter((file) => file.text.includes(artifact))
    .map((file) => file.path)
    .sort();
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const paths = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const files = paths.map((path) => {
    try {
      return { path, text: readFileSync(resolve(root, path), "utf8") };
    } catch {
      return { path, text: "" };
    }
  });
  const artifacts: Artifact[] = ARTIFACTS.map(([artifact, generator]) => ({
    artifact,
    generator,
    consumers: scan(files, artifact),
  }));
  console.log(JSON.stringify({ artifacts }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
