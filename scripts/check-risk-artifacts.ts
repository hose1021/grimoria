#!/usr/bin/env node
// Enforces the OpenSpec artifact package that a risk tier requires. An R3 pull
// request must name a real OpenSpec change with proposal, design, tasks and at
// least one delta spec; the risk label alone is not enough.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function riskArtifactFailures(body: string, root: string): string[] {
  const failures: string[] = [];
  const risk = /^Risk:\s*(R[0-3])\s*$/m.exec(body)?.[1];
  if (!risk) return ["the PR body has no Risk: R0-R3 line"];
  if (risk !== "R3") return [];
  const reference = /^OpenSpec change:\s*(\S+)/m.exec(body)?.[1];
  if (!reference) return ["an R3 change needs an `OpenSpec change:` line"];
  const name = reference
    .replace(/^.*?openspec\/changes\//, "")
    .replace(/^changes\//, "")
    .replace(/[),.;]+$/, "");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name))
    return [`OpenSpec change reference is not a change name: ${reference}`];
  const dir = join(root, "openspec", "changes", name);
  if (!existsSync(dir) || !statSync(dir).isDirectory())
    return [`${name}: no such OpenSpec change directory`];
  for (const file of ["proposal.md", "design.md", "tasks.md"])
    if (!existsSync(join(dir, file))) failures.push(`${name}: missing ${file}`);
  const specs: string[] = [];
  const walk = (path: string): void => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.name === "spec.md") specs.push(child);
    }
  };
  if (existsSync(join(dir, "specs"))) walk(join(dir, "specs"));
  if (!specs.length) failures.push(`${name}: no delta spec`);
  return failures;
}

function main(): void {
  const [bodyPath, rootArg] = process.argv.slice(2);
  if (!bodyPath) {
    console.error("usage: check-risk-artifacts.ts <pr-body> [root]");
    process.exitCode = 2;
    return;
  }
  const root = resolve(rootArg ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  const failures = riskArtifactFailures(readFileSync(bodyPath, "utf8"), root);
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    console.error(
      `Risk-dependent OpenSpec artifacts are incomplete: ${failures.length} problem(s).`,
    );
    process.exitCode = 1;
    return;
  }
  console.log("Risk-dependent OpenSpec artifacts are complete.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
