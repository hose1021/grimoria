#!/usr/bin/env node
// Every official rule that no atomic map covers is classified in
// docs/audits/rule-exceptions/<group>.json. Each file declares the slice of
// traceability.json it owns; this check proves that the slice is covered
// exactly once, that every entry keeps the trace statement and source, and
// that each classification has a reason and evidence.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = join(ROOT, "docs", "audits", "rule-exceptions");
const TRACE = join(ROOT, "docs", "audits", "verification-gates", "traceability.json");

const STATUSES = ["non-mechanical-exception", "mechanical-gap", "covered-but-unmapped"];

interface Source {
  file: string;
  page: string;
  revision: number;
  section: string;
}

interface OfficialRule {
  id: string;
  statement: string;
  source: Source;
  role: string | null;
  status: string;
  category: string;
}

interface Scope {
  role: string | null;
  statuses: string[];
  categories?: string[];
}

interface ExceptionRule {
  id: string;
  statement: string;
  source: Source;
  status: string;
  reason: string;
  evidence: string;
}

interface Group {
  group: string;
  scope: Scope;
  count: number;
  rules: ExceptionRule[];
}

function assigned(rule: OfficialRule, scope: Scope): boolean {
  if (rule.role !== scope.role) return false;
  if (!scope.statuses.includes(rule.status)) return false;
  return !scope.categories || scope.categories.includes(rule.category);
}

function sameSource(left: Source, right: Source): boolean {
  return (
    left.file === right.file &&
    left.page === right.page &&
    left.revision === right.revision &&
    left.section === right.section
  );
}

function filled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

const trace = JSON.parse(readFileSync(TRACE, "utf8")) as { officialRules: OfficialRule[] };
const byId = new Map(trace.officialRules.map((rule) => [rule.id, rule]));
const seen = new Map<string, string>();
const scopes: Array<{ file: string; scope: Scope }> = [];
const errors: string[] = [];

for (const name of readdirSync(DIR)
  .filter((entry) => entry.endsWith(".json"))
  .sort()) {
  const file = join("docs", "audits", "rule-exceptions", name);
  const group = JSON.parse(readFileSync(join(DIR, name), "utf8")) as Group;
  if (!filled(group.group)) errors.push(file + ": missing group name");
  if (!group.scope || !Array.isArray(group.scope.statuses)) {
    errors.push(file + ": missing scope with statuses");
    continue;
  }
  scopes.push({ file, scope: group.scope });
  if (group.count !== group.rules.length) {
    errors.push(
      file + ": count " + group.count + " does not match " + group.rules.length + " rules",
    );
  }
  for (const entry of group.rules) {
    const rule = byId.get(entry.id);
    if (!rule) {
      errors.push(file + ": unknown rule " + entry.id);
      continue;
    }
    if (!assigned(rule, group.scope)) {
      errors.push(file + ": " + entry.id + " is outside the declared scope");
    }
    if (entry.statement !== rule.statement) {
      errors.push(file + ": " + entry.id + " statement differs from traceability.json");
    }
    if (!sameSource(entry.source, rule.source)) {
      errors.push(file + ": " + entry.id + " source differs from traceability.json");
    }
    if (!STATUSES.includes(entry.status)) {
      errors.push(file + ": " + entry.id + " has unknown status " + entry.status);
    }
    if (!filled(entry.reason)) errors.push(file + ": " + entry.id + " has no reason");
    if (!filled(entry.evidence)) errors.push(file + ": " + entry.id + " has no evidence");
    const previous = seen.get(entry.id);
    if (previous) errors.push(entry.id + " is classified in " + previous + " and " + file);
    else seen.set(entry.id, file);
  }
}

const expected = new Map<string, string[]>();
for (const { file, scope } of scopes) {
  for (const rule of trace.officialRules) {
    if (!assigned(rule, scope)) continue;
    const owners = expected.get(rule.id) ?? [];
    owners.push(file);
    expected.set(rule.id, owners);
  }
}
for (const [id, owners] of expected) {
  const actual = seen.get(id);
  if (!actual) errors.push(id + " is in scope of " + owners.join(", ") + " but is not classified");
  else if (!owners.includes(actual))
    errors.push(id + " is classified in " + actual + ", outside its scope");
}
for (const [id, file] of seen) {
  if (!expected.has(id)) errors.push(file + ": " + id + " is not selected by any declared scope");
}

if (errors.length) {
  for (const error of errors) console.error(error);
  console.error("rule exceptions: " + errors.length + " error(s)");
  process.exitCode = 1;
} else {
  console.log("rule exceptions: " + seen.size + " rules across " + scopes.length + " group(s)");
}
