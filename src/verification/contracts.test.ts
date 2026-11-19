import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = join(ROOT, "docs", "audits", "verification-gates");
const trace = JSON.parse(readFileSync(join(DIR, "traceability.json"), "utf8")) as {
  officialRules: Array<{ id: string; engineRuleIds: string[]; uiContractIds: string[] }>;
  engineRules: Array<{
    id: string;
    level: string;
    citations: Array<{ file: string; name: string }>;
  }>;
  uiContracts: Array<{
    id: string;
    status: string;
    evidence: string;
    testRefs: string[];
  }>;
};
const manifest = JSON.parse(readFileSync(join(DIR, "test-manifest.json"), "utf8")) as {
  tests: Array<{ key: string }>;
  browser: Array<{ key: string }>;
};
const uncovered = JSON.parse(readFileSync(join(DIR, "uncovered.json"), "utf8")) as {
  officialRules: Array<{ id: string }>;
  engineRules: Array<{ id: string }>;
  uiContracts: Array<{ id: string }>;
};
const manifestKeys = new Set([...manifest.tests, ...manifest.browser].map((entry) => entry.key));

test("every official rule has unique identity and resolvable engine/UI references", () => {
  const ids = new Set<string>();
  for (const rule of trace.officialRules) {
    assert.equal(ids.has(rule.id), false, "duplicate official rule " + rule.id);
    ids.add(rule.id);
    for (const engine of rule.engineRuleIds) {
      assert.ok(
        trace.engineRules.some((item) => item.id === engine),
        rule.id + " -> " + engine,
      );
    }
    for (const ui of rule.uiContractIds) {
      assert.ok(
        trace.uiContracts.some((item) => item.id === ui),
        rule.id + " -> " + ui,
      );
    }
  }
});

test("every verified engine rule has a current citing test with its own rule id", () => {
  for (const rule of trace.engineRules) {
    if (rule.level !== "verified") continue;
    const current = rule.citations.filter(
      (citation) =>
        citation.name.includes(rule.id) && manifestKeys.has(citation.file + "::" + citation.name),
    );
    assert.ok(current.length > 0, rule.id);
    for (const citation of rule.citations) {
      assert.ok(existsSync(join(ROOT, citation.file)), citation.file);
    }
  }
});

test("every gate-covered UI contract names an existing test artifact", () => {
  for (const contract of trace.uiContracts) {
    if (["STATIC_VERIFIED", "UNREACHABLE", "OUT_OF_SCOPE"].includes(contract.evidence)) continue;
    assert.ok(contract.testRefs.length > 0, contract.id + " has no test refs");
    for (const file of contract.testRefs) assert.ok(existsSync(join(ROOT, file)), file);
    if (contract.evidence === "BROWSER_VERIFIED") {
      assert.ok(contract.testRefs.includes("scripts/browser-check.ts"), contract.id);
    }
    if (["CONTRACT_TESTED", "COMPONENT_TESTED"].includes(contract.evidence)) {
      assert.ok(
        contract.testRefs.some((file) => /\.test\.(ts|tsx)$/.test(file)),
        contract.id + " has no node test",
      );
    }
  }
});

test("every uncovered rule or contract is recorded with a reason", () => {
  const official = new Set(uncovered.officialRules.map((entry) => entry.id));
  const engine = new Set(uncovered.engineRules.map((entry) => entry.id));
  const ui = new Set(uncovered.uiContracts.map((entry) => entry.id));
  for (const rule of trace.engineRules) {
    if (rule.level !== "verified") assert.ok(engine.has(rule.id), rule.id);
  }
  for (const contract of trace.uiContracts) {
    if (
      contract.status !== "COMPLIANT" ||
      ["STATIC_VERIFIED", "UNREACHABLE", "OUT_OF_SCOPE"].includes(contract.evidence)
    ) {
      assert.ok(ui.has(contract.id), contract.id);
    }
  }
  for (const rule of trace.officialRules) {
    const hasUi = rule.uiContractIds.length > 0;
    if (!hasUi) assert.ok(official.has(rule.id), rule.id);
  }
});
