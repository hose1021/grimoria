#!/usr/bin/env node
// Enforces the OpenSpec artifact package that a risk tier requires. An R3 pull
// request must name an OpenSpec change that belongs to the same issue and holds
// proposal, design, tasks and a delta spec. A verification-policy migration may
// declare `Policy migration: true` instead of adding gameplay specifications.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function issueOf(text: string): string | null {
  return /^Issue:\s*(?:#|https?:\/\/\S*\/issues\/)?(\d+)/m.exec(text)?.[1] ?? null;
}

export function riskArtifactFailures(body: string, root: string): string[] {
  const failures: string[] = [];
  const risk = /^Risk:\s*(R[0-3])\s*$/m.exec(body)?.[1];
  if (!risk) return ["the PR body has no Risk: R0-R3 line"];
  if (risk !== "R3") return [];
  const issue = issueOf(body);
  if (!issue) failures.push("the PR body has no Issue: #N line");
  const reference = /^OpenSpec change:\s*(\S+)/m.exec(body)?.[1];
  if (!reference) return [...failures, "an R3 change needs an `OpenSpec change:` line"];
  const name = reference
    .replace(/^.*?openspec\/changes\//, "")
    .replace(/^changes\//, "")
    .replace(/[),.;]+$/, "");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name))
    return [...failures, `OpenSpec change reference is not a change name: ${reference}`];
  const dir = join(root, "openspec", "changes", name);
  if (!existsSync(dir) || !statSync(dir).isDirectory())
    return [...failures, `${name}: no such OpenSpec change directory`];
  for (const file of ["proposal.md", "design.md", "tasks.md"])
    if (!existsSync(join(dir, file))) failures.push(`${name}: missing ${file}`);
  if (existsSync(join(dir, "proposal.md")) && issue) {
    const changeIssue = issueOf(readFileSync(join(dir, "proposal.md"), "utf8"));
    if (changeIssue !== issue)
      failures.push(
        `${name}: proposal carries issue #${changeIssue ?? "none"}, the pull request is #${issue}`,
      );
  }
  const specs: string[] = [];
  const walk = (path: string): void => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.name === "spec.md") specs.push(child);
    }
  };
  if (existsSync(join(dir, "specs"))) walk(join(dir, "specs"));
  const policyMigration = /^Policy migration:\s*true\s*$/m.test(body);
  if (!specs.length && !policyMigration) failures.push(`${name}: no delta spec`);
  if (
    policyMigration &&
    !specs.some((spec) => spec.split("\\").join("/").includes("/specs/workflow/"))
  )
    failures.push(
      `${name}: a verification-policy migration needs a workflow delta spec under specs/workflow/`,
    );
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
