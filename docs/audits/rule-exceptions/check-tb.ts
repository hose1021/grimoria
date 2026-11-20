#!/usr/bin/env node
// Proves the Trouble Brewing register covers exactly the official TB rules that
// are still ROLE_LEVEL_ONLY or ENGINE_PARTIAL, with a pinned source and a
// non-empty reason. Covered entries must name a test and assertion.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const GATE = join(ROOT, "docs", "audits", "verification-gates");
const REGISTER = join(ROOT, "docs", "audits", "rule-exceptions", "tb.json");

const TB_ROLES: Record<string, true> = {
  washerwoman: true,
  librarian: true,
  investigator: true,
  chef: true,
  empath: true,
  "fortune-teller": true,
  undertaker: true,
  monk: true,
  ravenkeeper: true,
  virgin: true,
  slayer: true,
  soldier: true,
  mayor: true,
  butler: true,
  drunk: true,
  recluse: true,
  saint: true,
  poisoner: true,
  spy: true,
  "scarlet-woman": true,
  baron: true,
  imp: true,
};

const STATUSES: Record<string, true> = {
  "non-mechanical-exception": true,
  "mechanical-gap": true,
  "covered-but-unmapped": true,
};

interface Rule {
  id: string;
  statement: string;
  status: string;
  role: string | null;
  source: { file: string; page: string; revision: number; section: string };
}

interface Entry {
  id?: unknown;
  statement?: unknown;
  source?: Partial<Rule["source"]>;
  status?: unknown;
  reason?: unknown;
  evidence?: unknown;
}

const trace = JSON.parse(readFileSync(join(GATE, "traceability.json"), "utf8")) as {
  officialRules: Rule[];
};
const assigned = trace.officialRules.filter(
  (rule) =>
    rule.role !== null &&
    TB_ROLES[rule.role] === true &&
    (rule.status === "ROLE_LEVEL_ONLY" || rule.status === "ENGINE_PARTIAL"),
);
const byId = new Map(assigned.map((rule) => [rule.id, rule]));

const raw = JSON.parse(readFileSync(REGISTER, "utf8")) as unknown;
const entries: Entry[] = Array.isArray(raw)
  ? (raw as Entry[])
  : raw !== null && typeof raw === "object" && "rules" in raw && Array.isArray(raw.rules)
    ? (raw.rules as Entry[])
    : [];

const errors: string[] = [];
const seen = new Set<string>();
const counts: Record<string, number> = {};

for (const entry of entries) {
  const id = typeof entry.id === "string" ? entry.id : "";
  const rule = byId.get(id);
  if (!rule) {
    errors.push(`${id || "(missing id)"} is not an assigned Trouble Brewing rule`);
    continue;
  }
  if (seen.has(id)) errors.push(`${id} is listed more than once`);
  seen.add(id);

  const status = typeof entry.status === "string" ? entry.status : "";
  if (STATUSES[status] !== true) errors.push(`${id}: invalid status ${status || "(missing)"}`);
  counts[status] = (counts[status] ?? 0) + 1;

  if (typeof entry.reason !== "string" || !entry.reason.trim()) {
    errors.push(`${id}: reason is empty`);
  }
  if (typeof entry.statement !== "string" || !entry.statement.trim()) {
    errors.push(`${id}: statement is empty`);
  }
  const source = entry.source ?? {};
  for (const field of ["file", "page", "section"] as const) {
    if (source[field] !== rule.source[field]) {
      errors.push(`${id}: source.${field} does not match the pinned traceability source`);
    }
  }
  if (source.revision !== rule.source.revision) {
    errors.push(`${id}: source.revision does not match the pinned traceability source`);
  }
  if (status === "covered-but-unmapped") {
    if (typeof entry.evidence !== "string" || !entry.evidence.includes("::")) {
      errors.push(`${id}: covered-but-unmapped needs evidence of the form file::test`);
    }
  }
}

for (const rule of assigned) {
  if (!seen.has(rule.id)) errors.push(`${rule.id}: missing from the Trouble Brewing register`);
}

const summary = Object.entries(counts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([status, count]) => `${status}=${count}`)
  .join(", ");

if (errors.length) {
  console.error(`Trouble Brewing rule-exception check failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error("  - " + error);
  process.exitCode = 1;
} else {
  console.log(`Trouble Brewing rule-exception check passed: ${assigned.length} rules, ${summary}.`);
}
