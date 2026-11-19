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

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = join(ROOT, "docs", "audits", "verification-gates");
const TRACE = join(DIR, "traceability.json");
const MANIFEST = join(DIR, "test-manifest.json");
const COMMANDS = join(DIR, "command-scope.json");
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
  note: string;
}
interface Trace {
  officialRules: Array<{
    id: string;
    engineRuleIds: string[];
    uiContractIds: string[];
    status: string;
  }>;
  engineRules: EngineRule[];
  uiContracts: UiContract[];
}
interface Manifest {
  tests: Array<{ key: string; file: string; name: string }>;
  browser: Array<{ key: string; file: string; name: string }>;
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
const manifestKeys = new Set([...manifest.tests, ...manifest.browser].map((entry) => entry.key));

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
  .map((file) => read(join(ROOT, file)))
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
  const engine = new Set(trace.engineRules.map((rule) => rule.id));
  const ui = new Set(trace.uiContracts.map((contract) => contract.id));
  for (const rule of trace.officialRules) {
    if (official.has(rule.id)) fail("duplicate official rule " + rule.id);
    official.add(rule.id);
    for (const id of rule.engineRuleIds)
      if (!engine.has(id)) fail(`${rule.id} references unknown engine rule ${id}`);
    for (const id of rule.uiContractIds)
      if (!ui.has(id)) fail(`${rule.id} references unknown UI contract ${id}`);
  }
  for (const rule of trace.engineRules) {
    if (rule.level !== "verified") continue;
    const current = rule.citations.filter(
      (citation) =>
        citation.name.includes(rule.id) && manifestKeys.has(citation.file + "::" + citation.name),
    );
    if (!current.length) {
      fail(
        `verified engine rule ${rule.id} has no current citing test whose name carries the rule id`,
      );
    }
    for (const citation of rule.citations) {
      if (!existsSync(join(ROOT, citation.file))) {
        fail(`${rule.id} cites missing test file ${citation.file}`);
      } else if (!manifestKeys.has(citation.file + "::" + citation.name)) {
        finding(`${rule.id} has a stale matrix citation: ${citation.file}::${citation.name}`);
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
    const literal = uiSource.includes(`type: "${command}"`);
    const port = uiSource.includes(`commands.${command}(`);
    if (!literal && !port)
      fail(`UI command ${command} has no dispatch site in src/ui or src/entry`);
  }
  for (const [command, issue] of Object.entries(commandScope.missing)) {
    finding(`command ${command} has no UI caller; issue ${issue}`);
  }
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
checkCommandScope();
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
