#!/usr/bin/env node
// Acceptance check: the rules matrix, the shared support model and the user
// documentation must agree with the engine tests. No dependencies.
//
// A `verified` row must cite at least one existing test by file and name, and
// that test must pass. The support table in README and the secrets screen must
// report the same levels as the matrix. Every character gets a support entry,
// so a manual fallback can never happen silently.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MATRIX = join(ROOT, "docs", "rules-matrix.md");
const README = join(ROOT, "README.md");
const SECRETS = join(ROOT, "src", "ui", "screens", "secrets.tsx");
const STATUSES = new Set(["verified", "implemented-unverified", "host-choice", "unsupported"]);

const failures = [];
const fail = (message) => failures.push(message);

function read(path) {
  return readFileSync(path, "utf8");
}

function cellsOf(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

const matrixRows = read(MATRIX).split("\n").map(cellsOf).filter(Boolean);

// 1. Every verified row cites at least one test that exists and passes.
const passing = new Map();
function passingTests(file) {
  if (passing.has(file)) return passing.get(file);
  const path = join(ROOT, "js", file);
  if (!existsSync(path)) {
    passing.set(file, null);
    return null;
  }
  const output = execFileSync(process.execPath, ["--test", "--test-reporter=tap", path], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const names = new Set();
  for (const line of output.split("\n")) {
    const match = /^ok \d+ - (.*)$/.exec(line);
    if (match) names.add(match[1]);
  }
  passing.set(file, names);
  return names;
}

const roleLevels = new Map();
for (const cells of matrixRows) {
  if (cells.length < 3) continue;
  const status = cells.at(-1);
  if (!STATUSES.has(status)) continue;
  const roleMatch = /^`([a-z]+)`/.exec(cells[0]);
  if (roleMatch) {
    const list = roleLevels.get(roleMatch[1]) ?? [];
    list.push(status);
    roleLevels.set(roleMatch[1], list);
  }
  if (status !== "verified") continue;
  const label = cells.slice(0, 2).join(" / ").slice(0, 80);
  const citations = [...cells.at(-2).matchAll(/`([a-z-]+\.test\.mjs)`\s+"([^"]+)"/g)];
  if (!citations.length) {
    fail(`matrix row "${label}" is verified without a named test citation`);
    continue;
  }
  for (const [, file, name] of citations) {
    const names = passingTests(file);
    if (!names) {
      fail(`matrix row "${label}" cites missing test file ${file}`);
    } else if (!names.has(name)) {
      fail(`matrix row "${label}" cites ${file} "${name}", which does not pass`);
    }
  }
}

// Any line-number citation anywhere in the matrix rots as tests move.
for (const [index, line] of read(MATRIX).split("\n").entries()) {
  if (/\.test\.mjs:\d/.test(line)) {
    fail(`docs/rules-matrix.md:${index + 1} still cites a test line number instead of a name`);
  }
}

// 2. The support model must match the matrix levels exactly.
const supportModel = await import(join(ROOT, "src", "core", "model", "support.ts"));
const { ROLE_SUPPORT, scriptSupport } = supportModel;
const roleSupportEntries = supportModel.roleSupportEntries;
if (typeof roleSupportEntries !== "function") {
  fail("the support model has no roleSupportEntries, so the secrets screen can omit a role");
}
const { ALL_ROLES, BMR_ALL, SNV_ALL, SUPPORTED_ROLES } = await import(
  join(ROOT, "src", "core", "model", "rules.ts")
);

for (const roleId of SUPPORTED_ROLES) {
  const statuses = roleLevels.get(roleId);
  if (!statuses) {
    fail(`matrix has no row for supported role ${roleId}`);
    continue;
  }
  const level = statuses.includes("unsupported")
    ? "unsupported"
    : statuses.some((status) => status !== "verified")
      ? "requires-storyteller-choice"
      : "verified";
  if (ROLE_SUPPORT[roleId] !== level) {
    fail(`support model says ${roleId} is ${ROLE_SUPPORT[roleId]}, matrix says ${level}`);
  }
}

// 3. Every character has a screen entry; a manual fallback is never silent.
if (typeof roleSupportEntries === "function") {
  for (const roleId of SUPPORTED_ROLES) {
    const entries = roleSupportEntries([roleId]);
    if (entries.length !== 1) {
      fail(`the secrets screen has no support entry for ${roleId}`);
    } else if (entries[0].status === "verified" && ROLE_SUPPORT[roleId] !== "verified") {
      fail(`the secrets screen presents ${roleId} as automated`);
    }
  }
  const unknown = roleSupportEntries(["notarole"]);
  if (unknown.length !== 1 || unknown[0].status !== "unsupported") {
    fail("an unknown character must get an explicit unsupported screen entry");
  }
  for (const [label, roles] of [
    ["Trouble Brewing", ALL_ROLES],
    ["Bad Moon Rising", BMR_ALL],
    ["Sects & Violets", SNV_ALL],
  ]) {
    const entries = roleSupportEntries(roles);
    if (entries.length !== roles.length) {
      fail(`${label} loses ${roles.length - entries.length} support entries on the secrets screen`);
    }
  }
}

const secrets = read(SECRETS);
if (!secrets.includes("roleSupportEntries(") || !secrets.includes("supportSection(")) {
  fail("the secrets screen does not render the shared support entries");
}
if (!secrets.includes("data-script-support")) {
  fail("the secrets screen does not expose the script support level");
}
for (const path of ["src", "js"]) {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const child = join(dir, entry);
      if (statSync(child).isDirectory()) walk(child);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
        if (/BMR_ROLE_SUPPORT|bmrRoleSupport/.test(readFileSync(child, "utf8"))) {
          offenders.push(child);
        }
      }
    }
  };
  walk(join(ROOT, path));
  for (const offender of offenders) {
    fail(`${offender.slice(ROOT.length + 1)} keeps a second, divergent support table`);
  }
}

// 4. README claims the same per-scenario counts as the support model.
const readme = read(README);
const scenarioRows = {
  "Trouble Brewing": scriptSupport(ALL_ROLES),
  "Bad Moon Rising": scriptSupport(BMR_ALL),
  "Sects & Violets": scriptSupport(SNV_ALL),
};
for (const [name, support] of Object.entries(scenarioRows)) {
  const line = readme.split("\n").find((candidate) => candidate.startsWith(`| ${name} |`));
  if (!line) {
    fail(`README has no support row for ${name}`);
    continue;
  }
  const cells = cellsOf(line);
  const expected = [
    support.counts.verified,
    support.counts["requires-storyteller-choice"],
    support.counts.unsupported,
  ];
  const actual = cells.slice(1).map(Number);
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    fail(`README support row for ${name} is [${actual}], expected [${expected}]`);
  }
}

if (failures.length) {
  console.error("Acceptance check failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}
console.log(
  `Acceptance check passed: ${roleLevels.size} matrix roles, ${passing.size} test files.`,
);
