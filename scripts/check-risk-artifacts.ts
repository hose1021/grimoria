#!/usr/bin/env node
// Enforces the OpenSpec artifact package that a risk tier requires. An R3 pull
// request must name an OpenSpec change that belongs to the same issue and holds
// proposal, design, tasks and a delta spec. A verification-policy migration may
// declare `Policy migration: true` and must then carry a workflow delta spec.
// An archive-only transition may name the archived change: the package moves
// unchanged and the archive index and baseline keep its evidence.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function issueOf(text: string): string | null {
  return /^Issue:\s*(?:#|https?:\/\/\S*\/issues\/)?(\d+)/m.exec(text)?.[1] ?? null;
}

function isDir(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

interface Resolved {
  dir: string;
  archived: boolean;
}

function resolveChange(root: string, name: string): Resolved | null {
  const active = join(root, "openspec", "changes", name);
  if (isDir(active)) return { dir: active, archived: false };
  const archiveRoot = join(root, "openspec", "changes", "archive");
  if (!isDir(archiveRoot)) return null;
  for (const entry of readdirSync(archiveRoot)) {
    if (entry !== name && !entry.endsWith(`-${name}`)) continue;
    const dir = join(archiveRoot, entry);
    if (isDir(dir)) return { dir, archived: true };
  }
  return null;
}

function archiveEvidenceFailures(root: string, dir: string): string[] {
  const archivedName = basename(dir);
  const path = `openspec/changes/archive/${archivedName}`;
  const failures: string[] = [];
  const index = JSON.parse(
    readFileSync(join(root, "docs/audits/openspec-archive-index.json"), "utf8"),
  ) as { entries: Array<{ name: string; path: string }> };
  if (!index.entries.some((entry) => entry.path === path || entry.name === archivedName))
    failures.push(`${archivedName}: the archive index has no entry; archive evidence is lost`);
  const baseline = JSON.parse(
    readFileSync(join(root, "docs/audits/openspec-archive-baseline.json"), "utf8"),
  ) as { entries: Array<{ name: string }> };
  if (!baseline.entries.some((entry) => entry.name === archivedName))
    failures.push(`${archivedName}: the archive baseline does not pin it; evidence is unpinned`);
  return failures;
}

export interface ArtifactOptions {
  changedFiles?: readonly string[];
}

export function riskArtifactFailures(
  body: string,
  root: string,
  options: ArtifactOptions = {},
): string[] {
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
    .replace(/^(archive\/)?/, "")
    .replace(/^changes\//, "")
    .replace(/[),.;]+$/, "");
  if (!/^(?:\d{4}-\d{2}-\d{2}-)?[a-z0-9][a-z0-9-]*$/.test(name))
    return [...failures, `OpenSpec change reference is not a change name: ${reference}`];
  const resolved = resolveChange(root, name);
  if (!resolved)
    return [...failures, `${name}: no such OpenSpec change directory (active or archived)`];
  const { dir, archived } = resolved;
  if (!archived) {
    const activeName = basename(dir);
    const changed = options.changedFiles ?? [];
    if (!changed.some((candidate) => candidate.startsWith(`openspec/changes/${activeName}/`)))
      failures.push(`${name}: the pull request does not touch this change`);
  }
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
  const runtime = (candidate: string): boolean =>
    candidate.startsWith("src/core/engine/") ||
    candidate.startsWith("src/core/model/") ||
    candidate.startsWith("src/core/commands/") ||
    candidate.startsWith("src/entry/") ||
    candidate.startsWith("src/application/store/") ||
    candidate.startsWith("src/infrastructure/storage/") ||
    candidate.startsWith("docs/official/");
  if (
    policyMigration &&
    (options.changedFiles ?? []).some(runtime) &&
    !specs.some(
      (spec) =>
        spec.split("\\").join("/").includes("/specs/game/") ||
        spec.split("\\").join("/").includes("/specs/app/"),
    )
  )
    failures.push(
      `${name}: a workflow delta cannot cover runtime changes; add the behaviour change`,
    );
  if (archived) {
    failures.push(...archiveEvidenceFailures(root, dir));
    const changed = options.changedFiles ?? [];
    if (!changed.length) {
      failures.push(
        `${name}: an archived package needs the changed-files list to prove an archive-only transition`,
      );
    } else {
      const allowed = (path: string): boolean =>
        path.startsWith("openspec/changes/") ||
        path.startsWith("openspec/specs/") ||
        path.startsWith("docs/audits/openspec-archive-") ||
        path === "CHANGELOG.md";
      for (const path of changed.filter((candidate) => !allowed(candidate)))
        failures.push(
          `${name}: an archived package cannot cover a behavior change (${path}); open a new change`,
        );
    }
  }
  return failures;
}

function main(): void {
  const args = process.argv.slice(2);
  const changedIndex = args.indexOf("--changed-files");
  const changedPath = changedIndex >= 0 ? args[changedIndex + 1] : undefined;
  const positional = args.filter(
    (arg, index) => arg !== "--changed-files" && index !== changedIndex + 1,
  );
  const [bodyPath, rootArg] = positional;
  if (!bodyPath) {
    console.error("usage: check-risk-artifacts.ts <pr-body> [root]");
    process.exitCode = 2;
    return;
  }
  const root = resolve(rootArg ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
  const changedFiles = changedPath
    ? readFileSync(changedPath, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : undefined;
  const failures = riskArtifactFailures(readFileSync(bodyPath, "utf8"), root, { changedFiles });
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
