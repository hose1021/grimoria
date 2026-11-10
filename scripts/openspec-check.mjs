#!/usr/bin/env node
// Consistency check for the OpenSpec baseline and active changes.
// No dependencies: the repository has no package manager or lockfile.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPECS = join(ROOT, "openspec", "specs");
const CHANGES = join(ROOT, "openspec", "changes");
const DELTA_HEADERS = /^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements\s*$/m;

const failures = [];
const fail = (file, message) => failures.push(`${relative(ROOT, file)}: ${message}`);

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function sectionBody(text, heading) {
  const start = text.search(heading);
  if (start === -1) return null;
  const rest = text.slice(start).replace(heading, "");
  const end = rest.search(/\n## /);
  return (end === -1 ? rest : rest.slice(0, end)).replace(/<!--[\s\S]*?-->/g, "").trim();
}

function requirementBlocks(text) {
  return text.split(/^### Requirement: /m).slice(1);
}

function checkRequirement(file, block) {
  const name = block.split("\n", 1)[0].trim() || "(unnamed)";
  if (!/^#### Scenario: /m.test(block)) fail(file, `requirement "${name}" has no scenario`);
  if (!/\*\*Source\*\*:\s*\S/.test(block)) fail(file, `requirement "${name}" has no Source line`);
  const tests = block.match(/\*\*Tests\*\*:\s*(.+)/);
  if (!tests) {
    fail(file, `requirement "${name}" has no Tests line`);
    return;
  }
  const refs = [...tests[1].matchAll(/`([^`]+)`/g)].flatMap((match) => match[1].split(","));
  if (!refs.length) fail(file, `requirement "${name}" has no test reference`);
  for (const raw of refs) {
    const ref = raw.trim().replace(/:\d+(-\d+)?$/, "");
    if (!ref) continue;
    if (!existsSync(join(ROOT, ref))) fail(file, `requirement "${name}" cites a missing file: ${ref}`);
  }
}

for (const file of walk(SPECS).filter((path) => path.endsWith("spec.md"))) {
  const text = read(file);
  if (text === null) {
    fail(file, "unreadable");
    continue;
  }
  if (DELTA_HEADERS.test(text)) fail(file, "main spec contains a delta operation header");
  const purpose = sectionBody(text, /^## Purpose\s*$/m);
  if (purpose === null) fail(file, "missing ## Purpose");
  else if (purpose.length < 50) fail(file, "## Purpose is shorter than 50 characters");
  if (!/^## Requirements\s*$/m.test(text)) fail(file, "missing ## Requirements");
  const blocks = requirementBlocks(text);
  if (!blocks.length) fail(file, "no requirements");
  for (const block of blocks) checkRequirement(file, block);
}

const changeDirs = existsSync(CHANGES)
  ? readdirSync(CHANGES)
      .map((entry) => join(CHANGES, entry))
      .filter((path) => statSync(path).isDirectory() && !path.endsWith("archive"))
  : [];

for (const dir of changeDirs) {
  const name = relative(CHANGES, dir);
  for (const artifact of ["proposal.md", "design.md", "tasks.md"]) {
    if (!existsSync(join(dir, artifact))) fail(dir, `change "${name}" is missing ${artifact}`);
  }
  const proposal = read(join(dir, "proposal.md")) || "";
  if (!/^Issue:\s*(#\d+|https?:\/\/\S+)/m.test(proposal)) {
    fail(dir, `change "${name}" proposal has no "Issue: #N" line`);
  }
  const tasks = read(join(dir, "tasks.md")) || "";
  if (!/^- \[[ xX]\] /m.test(tasks)) fail(dir, `change "${name}" tasks have no checklist items`);
  if (!/^- RED:/m.test(tasks) || !/^- GREEN:/m.test(tasks)) {
    fail(dir, `change "${name}" tasks need "- RED:" and "- GREEN:" evidence lines`);
  }
  const deltas = walk(join(dir, "specs")).filter((path) => path.endsWith(".md"));
  if (!deltas.length) {
    fail(dir, `change "${name}" has no delta spec`);
    continue;
  }
  for (const delta of deltas) {
    const text = read(delta) || "";
    if (!DELTA_HEADERS.test(text)) fail(delta, "delta spec has no operation header");
    if (!requirementBlocks(text).length) fail(delta, "delta spec has no requirements");
  }
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

const prBodyPath = argument("--pr-body");
const changedFilesPath = argument("--changed-files");
if (prBodyPath) {
  const body = read(prBodyPath);
  const changed = changedFilesPath ? (read(changedFilesPath) || "").split("\n") : [];
  const touchesChanges = changed.some((path) => path.trim().startsWith("openspec/changes/"));
  if (body === null) fail(resolve(prBodyPath), "PR body file is unreadable");
  else if (touchesChanges) {
    if (!/^OpenSpec change:\s*\S+/m.test(body)) fail(resolve(prBodyPath), 'PR body has no "OpenSpec change:" line');
    if (!/^Issue:\s*(#\d+|https?:\/\/\S+)/m.test(body)) fail(resolve(prBodyPath), 'PR body has no "Issue: #N" line');
  }
}

if (failures.length) {
  console.error(`OpenSpec check failed with ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
const specCount = walk(SPECS).filter((path) => path.endsWith("spec.md")).length;
console.log(`OpenSpec check passed: ${specCount} spec(s), ${changeDirs.length} active change(s).`);
