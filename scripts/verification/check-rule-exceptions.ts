#!/usr/bin/env node
// Exact-coverage check for docs/audits/rule-exceptions/<script>.json.
//
// The audit document must contain every role rule of the script that is still
// ROLE_LEVEL_ONLY or ENGINE_PARTIAL in traceability.json, exactly once, with the
// official statement and source copied from the trace. Every evidence citation
// that names a test must point at a test in the committed test manifest.
//
// Usage: node scripts/verification/check-rule-exceptions.ts [bmr|tb|snv]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { BMR_ALL, SNV_ALL, TB } from "../../src/core/model/rules.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TRACE = join(ROOT, "docs", "audits", "verification-gates", "traceability.json");
const MANIFEST = join(ROOT, "docs", "audits", "verification-gates", "test-manifest.json");
const EXCEPTIONS = join(ROOT, "docs", "audits", "rule-exceptions");
const STATUSES = ["non-mechanical-exception", "mechanical-gap", "covered-but-unmapped"] as const;
const SCRIPTS: Record<string, string[]> = {
  bmr: BMR_ALL as string[],
  // TB and S&V have no audit document yet; listing their roles makes the
  // command fail with "missing file", not "unknown script".
  tb: TB.townsfolk.concat(TB.outsider, TB.minion, TB.demon) as string[],
  snv: SNV_ALL as string[],
};

interface Source {
  file?: unknown;
  page?: unknown;
  revision?: unknown;
  section?: unknown;
}
interface ExceptionRule {
  id?: unknown;
  role?: unknown;
  statement?: unknown;
  source?: Source;
  status?: unknown;
  reason?: unknown;
  evidence?: unknown;
}
interface ExceptionDocument {
  schemaVersion?: unknown;
  scope?: unknown;
  statusDefinitions?: Record<string, unknown>;
  counts?: Record<string, unknown>;
  rules?: ExceptionRule[];
}

const failures: string[] = [];
const fail = (message: string): void => {
  failures.push(message);
};
const text = (value: unknown): string => (typeof value === "string" ? value : "");

const scriptName = process.argv[2] || "bmr";
const scriptRoles = SCRIPTS[scriptName];
if (!scriptRoles) {
  console.error(
    `unknown script "${scriptName}"; expected one of ${Object.keys(SCRIPTS).join(", ")}`,
  );
  process.exit(2);
}

const trace = JSON.parse(readFileSync(TRACE, "utf8")) as {
  officialRules: {
    id: string;
    role: string | null;
    statement: string;
    source: { file: string; page: string; revision: number; section: string };
    status: string;
  }[];
};
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as { tests: { key: string }[] };
const knownTests = new Set(manifest.tests.map((test) => test.key));
const roles = new Set(scriptRoles.map((role) => role.replace(/-/g, "")));
const selected = trace.officialRules.filter(
  (rule) =>
    rule.role !== null &&
    roles.has(rule.role.replace(/-/g, "")) &&
    (rule.status === "ROLE_LEVEL_ONLY" || rule.status === "ENGINE_PARTIAL"),
);

let doc: ExceptionDocument;
try {
  doc = JSON.parse(
    readFileSync(join(EXCEPTIONS, `${scriptName}.json`), "utf8"),
  ) as ExceptionDocument;
} catch (error) {
  console.error(`${scriptName}.json is not readable: ${(error as Error).message}`);
  process.exit(1);
}

if (doc.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!text(doc.scope).trim()) fail("scope must be a non-empty string");
for (const status of STATUSES)
  if (!text(doc.statusDefinitions?.[status]).trim()) fail(`statusDefinitions.${status} is missing`);
if (!Array.isArray(doc.rules)) {
  fail("rules must be an array");
} else {
  const seen = new Set<string>();
  const expected = new Map(selected.map((rule) => [rule.id, rule]));
  const counts: Record<string, number> = {};
  for (const entry of doc.rules) {
    const id = text(entry.id);
    if (!id) {
      fail("a rule entry has no id");
      continue;
    }
    if (seen.has(id)) fail(`${id} appears more than once`);
    seen.add(id);
    const want = expected.get(id);
    if (!want) {
      fail(`${id} is not a ${scriptName.toUpperCase()} role rule with a non-verified status`);
      continue;
    }
    if (entry.role !== want.role)
      fail(`${id} has role ${JSON.stringify(entry.role)}, expected ${JSON.stringify(want.role)}`);
    if (entry.statement !== want.statement) fail(`${id} statement differs from traceability.json`);
    if (
      entry.source?.file !== want.source.file ||
      entry.source?.page !== want.source.page ||
      entry.source?.revision !== want.source.revision ||
      entry.source?.section !== want.source.section
    )
      fail(`${id} source differs from traceability.json`);
    if (!STATUSES.includes(entry.status as (typeof STATUSES)[number]))
      fail(`${id} has status ${JSON.stringify(entry.status)}; expected ${STATUSES.join(" | ")}`);
    else counts[entry.status as string] = (counts[entry.status as string] || 0) + 1;
    if (!text(entry.reason).trim()) fail(`${id} has no reason`);
    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
      fail(`${id} has no evidence`);
      continue;
    }
    for (const citation of entry.evidence) {
      if (!text(citation).trim()) {
        fail(`${id} has an empty evidence citation`);
        continue;
      }
      if (!text(citation).startsWith("test: ")) continue;
      // A bare citation ends the sentence, so a closing period is not part of the name.
      const key = text(citation).slice("test: ".length).split(" — ")[0]!.trim().replace(/\.$/, "");
      if (!knownTests.has(key)) fail(`${id} cites a test missing from test-manifest.json: ${key}`);
    }
  }
  for (const rule of selected)
    if (!seen.has(rule.id)) fail(`${rule.id} is missing from ${scriptName}.json`);
  counts.total = doc.rules.length;
  for (const [name, value] of Object.entries(counts))
    if (doc.counts?.[name] !== value)
      fail(`counts.${name} is ${String(doc.counts?.[name])}, expected ${value}`);
  for (const name of Object.keys(doc.counts || {}))
    if (!(name in counts)) fail(`counts.${name} is not a computed count`);
}

if (failures.length) {
  console.error(`${scriptName}.json failed exact-coverage check:`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  `${scriptName}.json covers ${doc.rules!.length} role rules exactly once: ` +
    STATUSES.map((status) => `${String(doc.counts?.[status] ?? 0)} ${status}`).join(", "),
);
console.log("Every statement and source matches traceability.json; every test citation resolves.");
