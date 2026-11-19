#!/usr/bin/env node
// Build the machine-readable Official Rule -> Engine Rule/Test -> UI Contract/Test
// trace. The generated file is committed; `--check` proves it is current.
//
// Sources:
// - docs/audits/verification-gates/official-rules.json (derived audit source)
// - docs/audits/verification-gates/ui-contracts.json (UI semantic audit source)
// - docs/rules-matrix.md + docs/rules-shared.md + src/core/roles/<role>/rule.md
//
// The mapping is deliberately rule/topic level, not a proof that one official
// sentence equals one engine branch. A mapping with no engine rule or no test
// is recorded as UNMAPPED/UNVERIFIED with a reason; it is not hidden.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { matrixRuleRows, parseRuleDoc } from "../rule-traceability.ts";
import type { Citation } from "../rule-traceability.ts";
import { officialRuleStatus } from "./gate-rules.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const GATE_DIR = join(ROOT, "docs", "audits", "verification-gates");
const OFFICIAL = join(GATE_DIR, "official-rules.json");
const UI = join(GATE_DIR, "ui-contracts.json");
const MATRIX = join(ROOT, "docs", "rules-matrix.md");
const SHARED = join(ROOT, "docs", "rules-shared.md");
const OUT = join(GATE_DIR, "traceability.json");
const MANIFEST = join(GATE_DIR, "test-manifest.json");
const ATOMIC = join(GATE_DIR, "atomic-map.json");

interface OfficialRule {
  id: string;
  statement: string;
  category: string;
  classification: string;
  role?: string;
  source: { file: string; page: string; revision: number; section: string };
}

interface UiContract {
  id: string;
  surface: string;
  element: string;
  mechanism: string;
  ruleIds: string[];
  source: string;
  tests: string;
  evidence: string;
  status: string;
  note: string;
  command: string;
  display: string;
  action: string;
  validation: string;
  stateEffect: string;
}

interface UiFile {
  version: number;
  commit: string;
  generatedAt: string;
  contracts: UiContract[];
}

interface EngineRule {
  id: string;
  role: string | null;
  level: string;
  revision: string | null;
  citations: Citation[];
  source: "matrix" | "shared" | "role-doc";
}

interface OfficialTrace {
  id: string;
  statement: string;
  category: string;
  classification: string;
  role: string | null;
  source: OfficialRule["source"];
  engineRuleIds: string[];
  engineTests: Citation[];
  engineLevels: string[];
  uiContractIds: string[];
  uiTests: string[];
  mapping: "atomic" | "role-level";
  status:
    | "ENGINE_VERIFIED"
    | "ENGINE_PARTIAL"
    | "ENGINE_UNVERIFIED"
    | "ROLE_LEVEL_ONLY"
    | "UNMAPPED";
  uiCoverage: "UI_COVERED" | "UI_CANDIDATE_ONLY" | "NO_UI_CONTRACT";
  note: string;
}

interface Trace {
  version: 1;
  commit: string;
  sources: string[];
  officialRules: OfficialTrace[];
  engineRules: EngineRule[];
  uiContracts: Array<UiContract & { testRefs: string[] }>;
  summary: Record<string, number>;
}

const read = (path: string): string => readFileSync(path, "utf8");
const json = <T>(path: string): T => JSON.parse(read(path)) as T;

function cellsOf(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function roleDocs(): EngineRule[] {
  const base = join(ROOT, "src", "core", "roles");
  const out: EngineRule[] = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(base, entry.name, "rule.md");
    if (!existsSync(path)) continue;
    const doc = parseRuleDoc(read(path));
    for (const rule of doc.rules) {
      out.push({
        id: rule.id,
        role: entry.name,
        level: rule.level,
        revision: rule.revision,
        citations: rule.citations,
        source: "role-doc",
      });
    }
  }
  return out;
}

function sharedRules(): EngineRule[] {
  if (!existsSync(SHARED)) return [];
  const doc = parseRuleDoc(read(SHARED));
  return doc.rules.map((rule) => ({
    id: rule.id,
    role: null,
    level: rule.level,
    revision: rule.revision,
    citations: rule.citations,
    source: "shared",
  }));
}

function engineRules(): EngineRule[] {
  const matrix = read(MATRIX)
    .split("\n")
    .map(cellsOf)
    .filter((cells): cells is string[] => cells !== null);
  const rows = matrixRuleRows(matrix);
  const docs = roleDocs();
  const shared = sharedRules();
  const byId = new Map<string, EngineRule>();
  for (const rule of [...docs, ...shared]) {
    if (byId.has(rule.id))
      throw new Error(
        `engine rule ${rule.id} is declared twice (${byId.get(rule.id)?.source} and ${rule.source})`,
      );
    byId.set(rule.id, rule);
  }
  const matrixIds = new Set<string>();
  for (const row of rows) {
    if (!row.id) continue;
    if (matrixIds.has(row.id)) throw new Error(`matrix declares engine rule ${row.id} twice`);
    matrixIds.add(row.id);
    const existing = byId.get(row.id);
    if (existing) {
      // Keep both the rule-document and the matrix citations. The gate requires
      // at least one citation to carry the rule id; related citations may not.
      const merged = new Map(
        [...existing.citations, ...row.citations].map((citation) => [
          citation.file + "::" + citation.name,
          citation,
        ]),
      );
      existing.citations = [...merged.values()].sort((a, b) =>
        (a.file + "::" + a.name).localeCompare(b.file + "::" + b.name),
      );
      existing.source = "matrix";
      continue;
    }
    byId.set(row.id, {
      id: row.id,
      role: row.role,
      level: row.level,
      revision: row.revision,
      citations: row.citations,
      source: "matrix",
    });
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function officialRules(): OfficialRule[] {
  const value = json<OfficialRule[]>(OFFICIAL);
  return value.slice().sort((a, b) => a.id.localeCompare(b.id));
}

function sharedMap(category: string): string[] {
  switch (category) {
    case "SETUP":
      return ["SYS-SETUP-01", "SYS-SETUP-02", "SYS-SETUP-03", "SYS-SETUP-04"];
    case "NIGHT":
      return ["SYS-NIGHT-01", "SYS-NIGHT-02", "SYS-NIGHT-03"];
    case "DAY":
    case "VOTE":
    case "EXEC":
      return ["SYS-VOTES-01", "SYS-VOTES-02", "SYS-VOTES-03", "SYS-WINS-01", "SYS-WINS-02"];
    case "DEATH":
    case "STATUS":
    case "INFO":
      return ["SYS-EFFECTS-01", "SYS-EFFECTS-02", "SYS-WINS-01"];
    case "WIN":
      return ["SYS-WINS-01", "SYS-WINS-02"];
    case "CORE":
      return ["SYS-LIFECYCLE-01", "SYS-LIFECYCLE-02", "SYS-WINS-01", "SYS-WINS-02"];
    case "ST":
      return ["SYS-EFFECTS-01", "SYS-PRIVACY-01"];
    default:
      return [];
  }
}

function testRefsOf(contract: UiContract): string[] {
  const text = [contract.tests, contract.source].join(";");
  const files = new Set<string>();
  for (const match of text.matchAll(
    /(?:src|scripts)\/[A-Za-z0-9_./-]+\.(?:test\.ts|test\.tsx|ts|tsx)/g,
  )) {
    const path = match[0];
    if (existsSync(join(ROOT, path))) files.add(path);
  }
  return [...files].sort();
}

function build(): Trace {
  const rules = engineRules();
  const roleKey = (value: string): string => value.replace(/-/g, "").toLowerCase();
  const byRole = new Map<string, EngineRule[]>();
  for (const rule of rules) {
    if (!rule.role) continue;
    const role = roleKey(rule.role);
    const list = byRole.get(role) ?? [];
    list.push(rule);
    byRole.set(role, list);
  }
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const uiFile = json<UiFile>(UI);
  const uiContracts = uiFile.contracts
    .map((contract) => ({ ...contract, testRefs: testRefsOf(contract) }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const manifest = existsSync(MANIFEST)
    ? (JSON.parse(read(MANIFEST)) as {
        tests: Array<{ key: string }>;
        browser: Array<{ key: string }>;
      })
    : { tests: [], browser: [] };
  const currentTest = new Set([...manifest.tests, ...manifest.browser].map((entry) => entry.key));
  const atomic = json<{ rules: Record<string, string[]> }>(ATOMIC).rules;
  for (const [ruleId, ids] of Object.entries(atomic)) {
    if (!ids.length) throw new Error(`atomic-map entry ${ruleId} lists no engine rule`);
    for (const id of ids) {
      if (!byId.has(id))
        throw new Error(`atomic-map entry ${ruleId} references unknown engine rule ${id}`);
    }
  }
  const official = officialRules().map((rule): OfficialTrace => {
    // Only an explicit entry may claim this statement is verified. Membership of
    // the role is a candidate list: another rule for the same character passing
    // says nothing about this sentence.
    const mapped = atomic[rule.id];
    const candidates =
      rule.role != null
        ? (byRole.get(roleKey(rule.role)) ?? []).map((item) => item.id)
        : sharedMap(rule.category);
    const engineIds = mapped ?? candidates;
    const engineRulesForRule = engineIds
      .map((id) => byId.get(id))
      .filter((item): item is EngineRule => Boolean(item));
    const engineTests = [
      ...new Map(
        engineRulesForRule
          .flatMap((item) => item.citations)
          .filter((item) => currentTest.has(item.file + "::" + item.name))
          .map((item) => [item.file + "::" + item.name, item]),
      ).values(),
    ].sort((a, b) => (a.file + a.name).localeCompare(b.file + b.name));
    const levels = [...new Set(engineRulesForRule.map((item) => item.level))].sort();
    const uiContractsForRule = uiContracts
      .filter((contract) => contract.ruleIds.some((id) => engineIds.includes(id)))
      .map((contract) => contract.id)
      .sort();
    const uiTests = [
      ...new Set(
        uiContractsForRule.flatMap((id) => uiContracts.find((c) => c.id === id)?.testRefs ?? []),
      ),
    ].sort();
    const status = officialRuleStatus({
      mapped: Boolean(mapped),
      engineRuleIds: engineIds,
      levels,
    });
    const note =
      status === "UNMAPPED"
        ? "No engine rule for this official category; outside the supported role set or needs a new mapping."
        : status === "ROLE_LEVEL_ONLY"
          ? "Mapped only at role/topic level; no explicit official-rule mapping yet, so this rule is not verified."
          : status === "ENGINE_PARTIAL"
            ? "Part of the rule is left to the Storyteller (host-choice); the engine offers the legal options."
            : status === "ENGINE_UNVERIFIED"
              ? "Engine rule is implemented-unverified or unsupported; needs a task and a test."
              : "";
    const uiCoverage: OfficialTrace["uiCoverage"] = !uiContractsForRule.length
      ? "NO_UI_CONTRACT"
      : mapped
        ? "UI_COVERED"
        : "UI_CANDIDATE_ONLY";
    return {
      id: rule.id,
      statement: rule.statement,
      category: rule.category,
      classification: rule.classification,
      role: rule.role ?? null,
      source: rule.source,
      engineRuleIds: [...new Set(engineIds)].sort(),
      engineTests,
      engineLevels: levels,
      uiContractIds: uiContractsForRule,
      uiTests,
      mapping: mapped ? "atomic" : "role-level",
      status,
      uiCoverage,
      note,
    };
  });

  const summary: Record<string, number> = {
    officialRules: official.length,
    engineRules: rules.length,
    uiContracts: uiContracts.length,
  };
  for (const rule of official) {
    summary[rule.status] = (summary[rule.status] ?? 0) + 1;
    summary[rule.uiCoverage] = (summary[rule.uiCoverage] ?? 0) + 1;
    if (!rule.engineTests.length)
      summary["officialRulesWithoutCurrentEngineTest"] =
        (summary["officialRulesWithoutCurrentEngineTest"] ?? 0) + 1;
  }
  return {
    version: 1,
    commit: process.env.GITHUB_SHA || "working-tree",
    sources: [
      "docs/audits/verification-gates/official-rules.json",
      "docs/audits/verification-gates/atomic-map.json",
      "docs/audits/verification-gates/ui-contracts.json",
      "docs/rules-matrix.md",
      "docs/rules-shared.md",
      "src/core/roles/*/rule.md",
    ],
    officialRules: official,
    engineRules: rules,
    uiContracts,
    summary,
  };
}

function main(): void {
  const trace = build();
  const text = JSON.stringify(trace, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (!existsSync(OUT)) {
      console.error("traceability.json is missing; run node scripts/verification/build-trace.ts");
      process.exit(1);
    }
    const current = read(OUT);
    // The commit field changes per run; compare the payload without it.
    const strip = (value: string): string =>
      JSON.stringify({ ...(JSON.parse(value) as Trace), commit: "working-tree" }, null, 2) + "\n";
    if (strip(current) !== strip(text)) {
      console.error("traceability.json is stale; run node scripts/verification/build-trace.ts");
      process.exit(1);
    }
    console.log(
      `Trace is current: ${trace.summary.officialRules} official rules, ${trace.summary.engineRules} engine rules, ${trace.summary.uiContracts} UI contracts.`,
    );
    return;
  }
  writeFileSync(OUT, text);
  console.log(
    `Wrote ${OUT}: ${trace.summary.officialRules} official rules, ${trace.summary.engineRules} engine rules, ${trace.summary.uiContracts} UI contracts.`,
  );
  console.log(JSON.stringify(trace.summary, null, 2));
}

main();
