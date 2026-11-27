#!/usr/bin/env node
// Read-only classification of active OpenSpec changes against the baseline.
// It reports what an archive review needs: the cited issue, the last commit
// that touched the change, the checklist, RED/GREEN evidence, and whether each
// delta requirement is already in the baseline spec. It writes nothing.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface Checklist {
  done: number;
  total: number;
  open: number;
}

export interface RequirementRef {
  capability: string;
  operation: string;
  name: string;
  synced: boolean;
}

export type Blocker = "open-tasks" | "unsynced-delta";
export type ChangeStatus = "archive-ready" | Blocker;

export interface LastChange {
  commit: string;
  date: string;
  subject: string;
}

export interface ChangeReport {
  name: string;
  issue: string | null;
  tasks: Checklist;
  evidence: boolean;
  requirements: RequirementRef[];
  status: ChangeStatus;
  blockers: Blocker[];
  lastChange: LastChange;
}

const OPERATION = /^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements\s*$/m;
const REQUIREMENT = /^### Requirement: (.+)$/gm;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseIssue(proposal: string): string | null {
  const match = /^Issue:\s*(\S+)/m.exec(proposal);
  return match ? match[1] : null;
}

export function parseChecklist(tasks: string): Checklist {
  const boxes = [...tasks.matchAll(/^- \[([ xX])\]/gm)].map((match) => match[1]);
  const done = boxes.filter((box) => box !== " ").length;
  return { done, total: boxes.length, open: boxes.length - done };
}

export function hasEvidence(tasks: string): boolean {
  return /^- RED:/m.test(tasks) && /^- GREEN:/m.test(tasks);
}

export function parseRequirements(
  path: string,
  text: string,
  baseline: (capability: string) => string | null,
): RequirementRef[] {
  const operation = OPERATION.exec(text)?.[1];
  if (!operation) throw new Error(`Delta spec has no operation header: ${path}`);
  const normalized = path.split("\\").join("/");
  const marker = normalized.includes("specs/")
    ? normalized.slice(normalized.indexOf("specs/") + "specs/".length)
    : "";
  const capability = marker.split("/").slice(0, 2).join("/");
  if (!capability || !capability.includes("/"))
    throw new Error(`Delta spec is outside a capability: ${path}`);
  const base = baseline(capability);
  const rows: RequirementRef[] = [];
  for (const match of text.matchAll(REQUIREMENT)) {
    const name = match[1].trim();
    const present =
      base !== null && new RegExp(`^### Requirement: ${escapeRegExp(name)}$`, "m").test(base);
    rows.push({
      capability,
      operation,
      name,
      synced: operation === "REMOVED" ? !present : present,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function classify(
  tasks: Checklist,
  requirements: readonly RequirementRef[],
): { status: ChangeStatus; blockers: Blocker[] } {
  const blockers: Blocker[] = [];
  if (tasks.open > 0) blockers.push("open-tasks");
  if (!requirements.length || !requirements.every((row) => row.synced))
    blockers.push("unsynced-delta");
  return { status: blockers[0] ?? "archive-ready", blockers };
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (entry.name.endsWith(".md")) out.push(path);
  }
  return out.sort();
}

function lastChange(root: string, name: string): LastChange {
  const record = execFileSync(
    "git",
    ["log", "-1", "--format=%H%x09%cs%x09%s", "--", `openspec/changes/${name}`],
    { cwd: root, encoding: "utf8" },
  ).trim();
  const [commit = "", date = "", subject = ""] = record.split("\t");
  return { commit, date, subject };
}

export function reconcile(root: string): Omit<ChangeReport, "lastChange">[] {
  const changesDir = join(root, "openspec", "changes");
  const specsDir = join(root, "openspec", "specs");
  const baseline = (capability: string): string | null => {
    const path = join(specsDir, capability, "spec.md");
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  };
  const names = readdirSync(changesDir)
    .filter((name) => name !== "archive" && statSync(join(changesDir, name)).isDirectory())
    .sort();
  return names.map((name) => {
    const dir = join(changesDir, name);
    const tasks = readFileSync(join(dir, "tasks.md"), "utf8");
    const requirements = walk(join(dir, "specs")).flatMap((path) =>
      parseRequirements(relative(dir, path), readFileSync(path, "utf8"), baseline),
    );
    const checklist = parseChecklist(tasks);
    return {
      name,
      issue: parseIssue(readFileSync(join(dir, "proposal.md"), "utf8")),
      tasks: checklist,
      evidence: hasEvidence(tasks),
      requirements,
      ...classify(checklist, requirements),
    };
  });
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const changes: ChangeReport[] = reconcile(root).map((report) => ({
    ...report,
    lastChange: lastChange(root, report.name),
  }));
  console.log(JSON.stringify({ commit, changes }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
