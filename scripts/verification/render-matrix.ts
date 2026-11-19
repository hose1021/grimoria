#!/usr/bin/env node
// Render the human-readable trace matrices from traceability.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = join(ROOT, "docs", "audits", "verification-gates");
const TRACE = join(DIR, "traceability.json");
const OFFICIAL_OUT = join(DIR, "traceability-matrix.md");
const UI_OUT = join(DIR, "ui-contract-test-matrix.md");

interface Trace {
  officialRules: Array<{
    id: string;
    category: string;
    status: string;
    engineRuleIds: string[];
    engineTests: Array<{ file: string; name: string }>;
    uiContractIds: string[];
    uiTests: string[];
    note: string;
  }>;
  uiContracts: Array<{
    id: string;
    surface: string;
    element: string;
    status: string;
    evidence: string;
    ruleIds: string[];
    testRefs: string[];
    note: string;
  }>;
  summary: Record<string, number>;
}

const trace = JSON.parse(readFileSync(TRACE, "utf8")) as Trace;
const statusCounts = new Map<string, number>();
for (const rule of trace.officialRules) {
  statusCounts.set(rule.status, (statusCounts.get(rule.status) ?? 0) + 1);
}
const uiStatusCounts = new Map<string, number>();
for (const contract of trace.uiContracts) {
  uiStatusCounts.set(contract.status, (uiStatusCounts.get(contract.status) ?? 0) + 1);
}

const official = `# Official Rule → Engine Test → UI Contract traceability

Generated from \`traceability.json\` by \`scripts/verification/render-matrix.ts\`. Do not edit by hand.

## Summary

| Metric | Count |
|---|---:|
| Official rules | ${trace.officialRules.length} |
${[...statusCounts].map(([key, value]) => `| ${key} | ${value} |`).join("\n")}
| Engine rules | ${trace.summary.engineRules} |
| UI contracts | ${trace.summary.uiContracts} |
| Official rules with no dedicated UI surface | ${trace.summary.NO_UI_CONTRACT ?? 0} |

A row is a **mapping**, not a proof of sentence-level equivalence. \`ENGINE_VERIFIED\` means at least one current engine test carries an engine rule ID; \`ENGINE_PARTIAL\` means at least one host-choice or unverified row weakens the rule. The official rule may be broader than the mapped engine rows.

## Official rules

| Official rule | Status | Engine rules | Current engine tests | UI contracts | UI tests | Note |
|---|---|---|---|---|---|---:|---|
${trace.officialRules
  .map(
    (rule) =>
      `| ${rule.id} | \`${rule.status}\` | ${rule.engineRuleIds.join("<br>") || "—"} | ${rule.engineTests.length} | ${rule.uiContractIds.join("<br>") || "—"} | ${rule.uiTests.length} | ${rule.note.replace(/\|/g, "\\|")} |`,
  )
  .join("\n")}
`;

const ui = `# UI Contract → Test traceability

Generated from \`traceability.json\` by \`scripts/verification/render-matrix.ts\`. Do not edit by hand.

## Summary

| Status | Count |
|---|---:|
${[...uiStatusCounts].map(([key, value]) => `| ${key} | ${value} |`).join("\n")}

A \`STATIC_VERIFIED\` row is a review status, not a passing gate test. Every non-compliant or static-only contract is listed in \`uncovered.json\` with its issue and required task.

| Contract | Surface | Element | Rule IDs | Status | Evidence | Test refs | Note |
|---|---|---|---|---|---|---|---|
${trace.uiContracts
  .map(
    (contract) =>
      `| ${contract.id} | ${contract.surface} | ${contract.element} | ${contract.ruleIds.join("<br>") || "—"} | \`${contract.status}\` | \`${contract.evidence}\` | ${contract.testRefs.join("<br>") || "—"} | ${contract.note.replace(/\|/g, "\\|")} |`,
  )
  .join("\n")}
`;

if (process.argv.includes("--check")) {
  const current = existsSync(OFFICIAL_OUT) ? readFileSync(OFFICIAL_OUT, "utf8") : "";
  const currentUi = existsSync(UI_OUT) ? readFileSync(UI_OUT, "utf8") : "";
  if (current !== official || currentUi !== ui) {
    console.error(
      "traceability matrices are stale; run node scripts/verification/render-matrix.ts",
    );
    process.exit(1);
  }
  console.log(
    `Trace matrices are current: ${trace.officialRules.length} official rules, ${trace.uiContracts.length} UI contracts.`,
  );
} else {
  writeFileSync(OFFICIAL_OUT, official);
  writeFileSync(UI_OUT, ui);
  console.log(`Wrote ${OFFICIAL_OUT} and ${UI_OUT}`);
}
