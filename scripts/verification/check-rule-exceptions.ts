#!/usr/bin/env node
// Coverage check for docs/audits/rule-exceptions/*.json.
//
// A register documents every official rule in its assigned set that the
// atomic map still leaves ROLE_LEVEL_ONLY or ENGINE_PARTIAL. This check proves
// that the register names each assigned rule exactly once, keeps the
// traceability statement and source, and uses a declared status.
//
// Usage: node scripts/verification/check-rule-exceptions.ts [register.json]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = join(ROOT, "docs", "audits", "rule-exceptions");
const TRACE = join(ROOT, "docs", "audits", "verification-gates", "traceability.json");
const ROLE_DIR = join(ROOT, "src", "core", "roles");

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
}
interface Trace {
  officialRules: OfficialRule[];
}
interface Entry {
  id: string;
  statement: string;
  source: Source;
  status: string;
  reason: string;
  evidence: string;
}
interface Scope {
  edition?: string;
  role?: string | null;
  statuses?: string[];
}
interface Register {
  edition?: string;
  role?: string | null;
  statuses?: string[];
  scope?: Scope;
  counts?: Record<string, number>;
  rules: Entry[];
}

const STATUSES = new Set(["non-mechanical-exception", "mechanical-gap", "covered-but-unmapped"]);
const DEFAULT_STATUSES = ["ROLE_LEVEL_ONLY", "ENGINE_PARTIAL"];
const failures: string[] = [];

const fail = (message: string): void => {
  failures.push(message);
};

const rolesForEdition = (edition: string): Set<string> => {
  const roles = new Set<string>();
  for (const entry of readdirSync(ROLE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let text: string;
    try {
      text = readFileSync(join(ROLE_DIR, entry.name, "role.ts"), "utf8");
    } catch {
      continue;
    }
    if (new RegExp(`edition:\\s*"${edition}"`).test(text)) roles.add(entry.name);
  }
  return roles;
};

const expectedRules = (register: Register): OfficialRule[] => {
  const trace = JSON.parse(readFileSync(TRACE, "utf8")) as Trace;
  const scope: Scope = register.scope ?? {
    edition: register.edition,
    ...(register.role !== undefined ? { role: register.role } : {}),
    statuses: register.statuses,
  };
  const statuses = new Set(scope.statuses ?? register.statuses ?? DEFAULT_STATUSES);
  let assigned: (rule: OfficialRule) => boolean;
  if ("role" in scope) {
    assigned = (rule) => rule.role === scope.role;
  } else if (scope.edition) {
    const roles = rolesForEdition(scope.edition);
    if (roles.size === 0) throw new Error(`no role module declares edition "${scope.edition}"`);
    // The module directory drops the hyphen in multi-word ids (evil-twin, fang-gu).
    assigned = (rule) => rule.role !== null && roles.has(rule.role.replace(/-/g, ""));
  } else {
    throw new Error("register needs scope.edition or scope.role (role may be null)");
  }
  return trace.officialRules.filter((rule) => assigned(rule) && statuses.has(rule.status));
};

const checkRegister = (path: string): void => {
  const register = JSON.parse(readFileSync(path, "utf8")) as Register;
  const rules = Array.isArray(register.rules) ? register.rules : null;
  if (!rules) {
    fail(`${path}: expected a "rules" array`);
    return;
  }
  const expected = expectedRules(register);
  const expectedIds = expected.map((rule) => rule.id);
  const seen = new Set<string>();
  for (const entry of rules) {
    if (seen.has(entry.id)) fail(`${path}: duplicate rule ${entry.id}`);
    seen.add(entry.id);
  }
  for (const id of expectedIds) {
    if (!seen.has(id)) fail(`${path}: missing rule ${id}`);
  }
  for (const id of seen) {
    if (!expectedIds.includes(id)) fail(`${path}: rule ${id} is not assigned to this register`);
  }
  const actualIds = rules.map((entry) => entry.id);
  if (actualIds.join("\n") !== expectedIds.join("\n")) {
    fail(`${path}: rules are not in traceability order`);
  }

  const byId = new Map(expected.map((rule) => [rule.id, rule]));
  for (const entry of rules) {
    const rule = byId.get(entry.id);
    if (!rule) continue;
    if (entry.statement !== rule.statement)
      fail(`${path}: ${entry.id}: statement differs from traceability`);
    if (JSON.stringify(entry.source) !== JSON.stringify(rule.source))
      fail(`${path}: ${entry.id}: source differs from traceability`);
    if (!STATUSES.has(entry.status)) fail(`${path}: ${entry.id}: unknown status "${entry.status}"`);
    if (typeof entry.reason !== "string" || entry.reason.trim() === "")
      fail(`${path}: ${entry.id}: empty reason`);
    if (typeof entry.evidence !== "string" || entry.evidence.trim() === "")
      fail(`${path}: ${entry.id}: empty evidence`);
  }

  const counts: Record<string, number> = { total: rules.length };
  for (const entry of rules) counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  for (const [key, value] of Object.entries(counts)) {
    if (register.counts && register.counts[key] !== value)
      fail(`${path}: counts.${key} is ${register.counts[key]}, expected ${value}`);
  }
  if (failures.length === 0) {
    console.log(`${path}: ${rules.length} rules covered exactly`);
    console.log(
      "  " +
        Object.entries(counts)
          .map(([key, value]) => `${key}=${value}`)
          .join(", "),
    );
  }
};

const requested = process.argv.slice(2);
const paths =
  requested.length > 0
    ? requested
    : readdirSync(DIR)
        .filter((name) => name.endsWith(".json"))
        .map((name) => join(DIR, name));
if (paths.length === 0) {
  console.error("no rule-exception register found");
  process.exit(2);
}
for (const path of paths) {
  try {
    checkRegister(path);
  } catch (error) {
    fail(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
