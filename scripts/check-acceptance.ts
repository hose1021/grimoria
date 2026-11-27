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
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const moduleUrl = (path: string): string => pathToFileURL(join(ROOT, path)).href;
const MATRIX = join(ROOT, "docs", "rules-matrix.md");
const README = join(ROOT, "README.md");
const SECRETS = join(ROOT, "src", "ui", "screens", "secrets.tsx");

const failures: string[] = [];
const fail = (message: string): number => failures.push(message);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function cellsOf(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

// 1. Every verified row cites at least one test that exists and passes.
const passing = new Map<string, Set<string> | null>();
function passingTests(file: string): Set<string> | null {
  if (passing.has(file)) return passing.get(file) ?? null;
  if (!file.includes("/")) {
    passing.set(file, null);
    return null;
  }
  const path = join(ROOT, file);
  if (!existsSync(path)) {
    passing.set(file, null);
    return null;
  }
  const output = execFileSync(process.execPath, ["--test", "--test-reporter=tap", path], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const names = new Set<string>();
  for (const line of output.split("\n")) {
    const match = /^ok \d+ - (.*)$/.exec(line);
    if (match) names.add(match[1]);
  }
  passing.set(file, names);
  return names;
}

// Any line-number citation anywhere in the matrix rots as tests move.
for (const [index, line] of read(MATRIX).split("\n").entries()) {
  if (/\.test\.ts:\d/.test(line)) {
    fail(`docs/rules-matrix.md:${index + 1} still cites a test line number instead of a name`);
  }
}

// 1b. Rule identifiers connect every verified row to a test name and a rule
// document; the identifier must still point at a matrix row that exists.
const { ALL_ROLES, BMR_ALL, SNV_ALL, SUPPORTED_ROLES } = await import(
  moduleUrl("src/core/model/rules.ts")
);
const supported = new Set(SUPPORTED_ROLES);
const rolesDir = join(ROOT, "src", "core", "roles");
const registryDoc = (path: string) => {
  const raw = JSON.parse(read(path)) as {
    rules: Array<{
      id: string;
      edition: string;
      level: string;
      revision: string;
      assertingTests: Array<{ file: string; name: string }>;
    }>;
  };
  return {
    edition: raw.rules[0]?.edition ?? "shared",
    rules: raw.rules.map((rule) => ({
      id: rule.id,
      level: rule.level,
      revision: rule.revision,
      citations: rule.assertingTests,
    })),
  };
};
const docs: Array<{
  role: string;
  edition: string;
  rules: Array<{
    id: string;
    level: string;
    revision: string;
    citations: Array<{ file: string; name: string }>;
  }>;
}> = [];
for (const entry of readdirSync(rolesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  if (!supported.has(entry.name)) {
    fail(`src/core/roles/${entry.name} is not a supported role`);
    continue;
  }
  if (!existsSync(join(rolesDir, entry.name, "role.ts"))) {
    fail(`${entry.name} has no role module`);
  }
  const registryPath = join(ROOT, "rules", "roles", `${entry.name}.json`);
  if (!existsSync(registryPath)) {
    fail(`${entry.name} has no registry rules`);
    continue;
  }
  docs.push({ role: entry.name, ...registryDoc(registryPath) });
}
const documented = new Set(docs.map((doc) => doc.role));
for (const role of SUPPORTED_ROLES) {
  if (!documented.has(role)) fail(`${role} has no registry rules`);
}
const shared = registryDoc(join(ROOT, "rules", "shared.json")).rules;
for (const rule of shared) {
  for (const citation of rule.citations) {
    const names = passingTests(citation.file);
    if (!names) {
      fail(`${rule.id} cites missing test file ${citation.file}`);
    } else if (!names.has(citation.name)) {
      fail(`${rule.id} cites ${citation.file} "${citation.name}", which does not pass`);
    }
  }
}
const roleLevels = new Map<string, string[]>();
for (const doc of docs) {
  roleLevels.set(
    doc.role,
    doc.rules.map((rule) => rule.level),
  );
  for (const rule of doc.rules) {
    if (rule.level !== "verified") continue;
    if (!rule.citations.length) {
      fail(`${rule.id} is verified without a named test citation`);
      continue;
    }
    for (const citation of rule.citations) {
      const names = passingTests(citation.file);
      if (!names) fail(`${rule.id} cites missing test file ${citation.file}`);
      else if (!names.has(citation.name))
        fail(`${rule.id} cites ${citation.file} "${citation.name}", which does not pass`);
    }
  }
}

// 2. The support model must match the registry levels exactly.
const supportModel = await import(moduleUrl("src/core/model/support.ts"));
const { ROLE_SUPPORT, scriptSupport } = supportModel;
const roleSupportEntries = supportModel.roleSupportEntries;
if (typeof roleSupportEntries !== "function") {
  fail("the support model has no roleSupportEntries, so the secrets screen can omit a role");
}

for (const roleId of SUPPORTED_ROLES) {
  const statuses = roleLevels.get(roleId);
  if (!statuses) {
    fail(`no registry rules for supported role ${roleId}`);
    continue;
  }
  const level = statuses.includes("unsupported")
    ? "unsupported"
    : statuses.some((status) => status !== "verified")
      ? "requires-storyteller-choice"
      : "verified";
  if (ROLE_SUPPORT[roleId] !== level) {
    fail(`support model says ${roleId} is ${ROLE_SUPPORT[roleId]}, registry says ${level}`);
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
for (const path of ["src"]) {
  const offenders: string[] = [];
  const walk = (dir: string): void => {
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
  const cells = cellsOf(line) ?? [];
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
