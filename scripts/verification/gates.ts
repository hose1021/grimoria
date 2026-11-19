#!/usr/bin/env node
// Permanent semantic verification gate.
//
// Scope `verified` checks the contracts that are currently assertable and
// gate-covered. Scope `findings` checks every known non-compliant contract and
// runs the regression suite; it is expected to fail until the linked issues are
// fixed. Scope `all` is the release gate and fails while any finding is open.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { commandReferences, stripComments } from "./source-text.ts";
import { coveragePinFailures, downgradeFailures, verifiedCitationFailure } from "./gate-rules.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = join(ROOT, "docs", "audits", "verification-gates");
const TRACE = join(DIR, "traceability.json");
const MANIFEST = join(DIR, "test-manifest.json");
const COMMANDS = join(DIR, "command-scope.json");
const ATOMIC = join(DIR, "atomic-map.json");
const REMOVED_VERIFICATION = join(DIR, "removed-verification.json");
const FINDINGS_TEST = join(ROOT, "scripts", "verification", "findings.test.ts");
const scopeArg = process.argv.find((arg) => arg.startsWith("--scope="));
const SCOPE = scopeArg ? scopeArg.slice("--scope=".length) : "all";
if (!["verified", "findings", "all"].includes(SCOPE)) {
  console.error("--scope must be verified, findings or all");
  process.exit(2);
}

interface Citation {
  file: string;
  name: string;
}
interface EngineRule {
  id: string;
  level: string;
  role: string | null;
  citations: Citation[];
}
interface UiContract {
  id: string;
  status: string;
  evidence: string;
  testRefs: string[];
  tests?: string;
  source?: string;
  note: string;
}
interface Trace {
  officialRules: Array<{
    id: string;
    engineRuleIds: string[];
    engineTests: Citation[];
    uiContractIds: string[];
    mapping: string;
    status: string;
  }>;
  engineRules: EngineRule[];
  uiContracts: UiContract[];
}
interface ManifestEntry {
  key: string;
  file: string;
  name: string;
  skipped?: true;
}
interface Manifest {
  tests: ManifestEntry[];
  browser: ManifestEntry[];
}

const failures: string[] = [];
const findings: string[] = [];
const fail = (message: string): void => {
  failures.push(message);
};
const finding = (message: string): void => {
  findings.push(message);
};
const read = (path: string): string => readFileSync(path, "utf8");
const run = (args: string[]): { ok: boolean; output: string } => {
  try {
    return {
      ok: true,
      output: execFileSync(process.execPath, args, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    const value = error as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, output: (value.stdout ?? "") + (value.stderr ?? value.message ?? "") };
  }
};

const trace = JSON.parse(read(TRACE)) as Trace;
const manifest = JSON.parse(read(MANIFEST)) as Manifest;
const commandScope = JSON.parse(read(COMMANDS)) as {
  ui: string[];
  product: string[];
  internal: string[];
  missing: Record<string, string>;
};
const manifestEntries = new Map(
  [...manifest.tests, ...manifest.browser].map((entry) => [entry.key, entry]),
);
const manifestKeys = new Set(manifestEntries.keys());

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(relative(ROOT, path).split("\\").join("/"));
  }
  return out;
}

const uiSource = [
  ...sourceFiles(join(ROOT, "src", "ui")),
  ...sourceFiles(join(ROOT, "src", "entry")),
]
  .map((file) => stripComments(read(join(ROOT, file))))
  .join("\n");

function commandTypes(): string[] {
  const text = read(join(ROOT, "src", "core", "commands", "contracts.ts"));
  const block = /export const COMMAND_TYPES = \[([\s\S]*?)\] as const;/.exec(text);
  if (!block) return [];
  return [...block[1].matchAll(/"([A-Za-z]+)"/g)].map((match) => match[1]);
}

function checkCurrentData(): void {
  const traceCheck = run(["scripts/verification/build-trace.ts", "--check"]);
  if (!traceCheck.ok) fail("traceability.json is stale or invalid: " + traceCheck.output.trim());
  const manifestCheck = run(["scripts/verification/test-index.ts", "--check"]);
  if (!manifestCheck.ok)
    fail("test-manifest.json is stale or a test was removed: " + manifestCheck.output.trim());
  const uncoveredCheck = run(["scripts/verification/build-uncovered.ts", "--check"]);
  if (!uncoveredCheck.ok) fail("uncovered.json is stale: " + uncoveredCheck.output.trim());
  const matrixCheck = run(["scripts/verification/render-matrix.ts", "--check"]);
  if (!matrixCheck.ok) fail("traceability matrices are stale: " + matrixCheck.output.trim());
}

function checkTrace(): void {
  const official = new Set<string>();
  const engine = new Set<string>();
  const ui = new Set(trace.uiContracts.map((contract) => contract.id));
  for (const rule of trace.engineRules) {
    if (engine.has(rule.id)) fail(`duplicate engine rule ${rule.id}`);
    engine.add(rule.id);
  }
  for (const rule of trace.officialRules) {
    if (official.has(rule.id)) fail("duplicate official rule " + rule.id);
    official.add(rule.id);
    for (const id of rule.engineRuleIds)
      if (!engine.has(id)) fail(`${rule.id} references unknown engine rule ${id}`);
    for (const id of rule.uiContractIds)
      if (!ui.has(id)) fail(`${rule.id} references unknown UI contract ${id}`);
    if (rule.status === "ENGINE_VERIFIED") {
      if (rule.mapping !== "atomic")
        fail(`${rule.id} claims ENGINE_VERIFIED without an atomic mapping`);
      if (!rule.engineRuleIds.length) fail(`${rule.id} claims ENGINE_VERIFIED with no engine rule`);
      if (!rule.engineTests.length)
        fail(`${rule.id} claims ENGINE_VERIFIED with no current engine test`);
    }
    if (
      rule.mapping === "role-level" &&
      rule.status !== "ROLE_LEVEL_ONLY" &&
      rule.status !== "UNMAPPED"
    )
      fail(`${rule.id} has a role-level mapping but status ${rule.status}`);
  }
  for (const rule of trace.engineRules) {
    if (rule.level !== "verified") continue;
    const citationFailure = verifiedCitationFailure({
      ruleId: rule.id,
      citations: rule.citations,
      entries: manifestEntries,
    });
    if (citationFailure) fail(citationFailure);
    for (const citation of rule.citations) {
      if (!existsSync(join(ROOT, citation.file))) {
        fail(`${rule.id} cites missing test file ${citation.file}`);
      } else if (!manifestKeys.has(citation.file + "::" + citation.name)) {
        const stale = `${rule.id} has a stale matrix citation: ${citation.file}::${citation.name}`;
        if (rule.level === "verified") fail(stale);
        else finding(stale);
      }
    }
  }
  for (const contract of trace.uiContracts) {
    if (["STATIC_VERIFIED", "UNREACHABLE", "OUT_OF_SCOPE"].includes(contract.evidence)) {
      finding(`${contract.id} is ${contract.status}/${contract.evidence}; see uncovered.json`);
      continue;
    }
    if (!contract.testRefs.length) {
      fail(`${contract.id} claims ${contract.evidence} but lists no test file`);
      continue;
    }
    for (const file of contract.testRefs) {
      if (!existsSync(join(ROOT, file))) fail(`${contract.id} lists missing test ${file}`);
    }
    if (
      contract.evidence === "BROWSER_VERIFIED" &&
      !contract.testRefs.includes("scripts/browser-check.ts")
    ) {
      fail(`${contract.id} is BROWSER_VERIFIED without scripts/browser-check.ts`);
    }
    for (const match of `${contract.tests ?? ""};${contract.source ?? ""}`.matchAll(
      /scripts\/browser-check\.ts[ :]+([A-Za-z0-9 _-]+)/g,
    )) {
      const name = match[1].trim();
      if (!manifestKeys.has(`scripts/browser-check.ts::${name}`))
        finding(`${contract.id} names a browser scenario the suite does not run: ${name}`);
    }
    if (
      ["CONTRACT_TESTED", "COMPONENT_TESTED"].includes(contract.evidence) &&
      !contract.testRefs.some((file) => /\.test\.(ts|tsx)$/.test(file))
    ) {
      fail(`${contract.id} is ${contract.evidence} without a node test file`);
    }
    if (contract.status !== "COMPLIANT")
      finding(`${contract.id} is ${contract.status}: ${contract.note}`);
  }
  for (const rule of trace.engineRules) {
    if (rule.level === "implemented-unverified" || rule.level === "unsupported") {
      finding(`engine rule ${rule.id} is ${rule.level}`);
    }
  }
}

function checkCommandScope(): void {
  const all = commandTypes();
  if (!all.length) fail("could not read COMMAND_TYPES");
  const categories = new Map<string, string>();
  for (const [category, list] of [
    ["ui", commandScope.ui],
    ["product", commandScope.product],
    ["internal", commandScope.internal],
  ] as const) {
    for (const command of list) {
      const prior = categories.get(command);
      if (prior) fail(`command ${command} is classified as ${prior} and ${category}`);
      categories.set(command, category);
    }
  }
  for (const command of Object.keys(commandScope.missing)) {
    const prior = categories.get(command);
    if (prior) fail(`command ${command} is both ${prior} and missing`);
    categories.set(command, "missing");
  }
  for (const command of all) {
    if (!categories.has(command)) fail(`command ${command} has no reachability classification`);
  }
  for (const command of commandScope.ui) {
    if (commandReferences(uiSource, command) === 0)
      fail(`UI command ${command} has no dispatch site outside comments in src/ui or src/entry`);
  }
  for (const [command, issue] of Object.entries(commandScope.missing)) {
    finding(`command ${command} has no UI caller; issue ${issue}`);
  }
}

function checkVerifiedTests(): void {
  const files = new Set<string>();
  for (const rule of trace.engineRules) {
    if (rule.level !== "verified") continue;
    for (const citation of rule.citations) {
      if (!citation.name.includes(rule.id)) continue;
      if (manifestEntries.get(citation.file + "::" + citation.name)?.skipped) continue;
      files.add(citation.file);
    }
  }
  if (!files.size) {
    fail("no current test backs a verified engine rule");
    return;
  }
  const result = run(["--test", ...[...files].sort()]);
  if (result.ok) return;
  const lines = result.output
    .split("\n")
    .filter((line) => /not ok|✖|failing|Error:/.test(line))
    .slice(0, 30);
  fail("cited verified test files do not pass:\n" + lines.join("\n"));
}

function checkCoverageRemoval(): void {
  const allowlist = JSON.parse(read(join(DIR, "removed-tests.json"))) as {
    removed: Record<string, string>;
  };
  const allow = allowlist.removed;
  const base = process.env.VERIFICATION_BASE_REF;
  if (!base) {
    finding("VERIFICATION_BASE_REF is unset; coverage removal against the base branch was skipped");
    return;
  }
  let before: Manifest;
  try {
    before = JSON.parse(
      execFileSync("git", ["show", `${base}:docs/audits/verification-gates/test-manifest.json`], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    ) as Manifest;
  } catch {
    finding(`no base test manifest at ${base}; coverage removal was not checked`);
    return;
  }
  const after = new Map(
    [...manifest.tests, ...manifest.browser].map((entry) => [entry.key, entry]),
  );
  for (const failure of coveragePinFailures({
    before: [...before.tests, ...before.browser],
    after: [...after.values()],
    allow,
  }))
    fail(failure);
}

function checkAtomicDowngrade(): void {
  const allowlist = JSON.parse(read(REMOVED_VERIFICATION)) as {
    removed: Record<string, string>;
  };
  const current = Object.keys(
    (JSON.parse(read(ATOMIC)) as { rules: Record<string, string[]> }).rules,
  );
  let before: string[] = [];
  const base = process.env.VERIFICATION_BASE_REF;
  if (base) {
    try {
      const text = execFileSync(
        "git",
        ["show", `${base}:docs/audits/verification-gates/atomic-map.json`],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      before = Object.keys((JSON.parse(text) as { rules: Record<string, string[]> }).rules);
    } catch {
      finding(`no base atomic map at ${base}; verification downgrade was not checked`);
      return;
    }
  }
  for (const failure of downgradeFailures({ before, after: current, allow: allowlist.removed }))
    fail(failure);
}

function checkArchitecture(): void {
  const result = run(["scripts/check-types-policy.ts"]);
  if (!result.ok) fail("architecture/type policy failed:\n" + result.output.trim());
}

function runFindingsTests(): void {
  const result = run(["--test", "scripts/verification/findings.test.ts"]);
  if (!result.ok) {
    const lines = result.output.split("\n").filter((line) => /not ok|✖|failing|Error:/.test(line));
    fail("known-findings regression suite failed:\n" + lines.slice(0, 40).join("\n"));
  }
}

checkCurrentData();
checkTrace();
checkVerifiedTests();
checkCommandScope();
checkCoverageRemoval();
checkAtomicDowngrade();
checkArchitecture();
if (SCOPE === "findings" || SCOPE === "all") {
  for (const item of findings) fail(item);
  if (existsSync(FINDINGS_TEST)) runFindingsTests();
  else fail("scripts/verification/findings.test.ts is missing");
}

if (failures.length) {
  console.error(`verification gate failed (${failures.length}):`);
  for (const item of failures.slice(0, 200)) console.error("  - " + item);
  process.exit(1);
}
console.log(
  `verification gate passed (${SCOPE}): ${trace.officialRules.length} official rules, ${trace.engineRules.length} engine rules, ${trace.uiContracts.length} UI contracts; ${findings.length} known finding(s) recorded.`,
);
