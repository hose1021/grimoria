#!/usr/bin/env node
// Every official rule that is not sentence-verified must be either a recorded
// mechanical gap or a documented non-mechanical exception with its pinned
// source. The register is split by edition/shared group so a review stays
// reviewable; this check proves the union is exact.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const GATE = join(ROOT, "docs", "audits", "verification-gates");
const DIR = join(ROOT, "docs", "audits", "rule-exceptions");

interface TraceRule {
  id: string;
  statement: string;
  status: string;
  role: string | null;
  category: string;
  source: { file: string; page: string; revision: number; section: string };
}

interface Source {
  file?: unknown;
  page?: unknown;
  revision?: unknown;
  section?: unknown;
}

interface Entry {
  id?: unknown;
  statement?: unknown;
  source?: Source;
  status?: unknown;
  reason?: unknown;
  evidence?: unknown;
}

const STATUSES = new Set(["non-mechanical-exception", "mechanical-gap", "covered-but-unmapped"]);

const trace = JSON.parse(readFileSync(join(GATE, "traceability.json"), "utf8")) as {
  officialRules: TraceRule[];
};
const required: Record<string, TraceRule> = Object.fromEntries(
  trace.officialRules
    .filter((rule) => rule.status === "ROLE_LEVEL_ONLY" || rule.status === "ENGINE_PARTIAL")
    .map((rule) => [rule.id, rule]),
);

function entriesOf(raw: unknown): Entry[] {
  if (Array.isArray(raw)) return raw as Entry[];
  if (raw && typeof raw === "object" && "rules" in raw && Array.isArray(raw.rules)) {
    return raw.rules as Entry[];
  }
  return [];
}

const errors: string[] = [];
const seen = new Map<string, string>();
const counts: Record<string, number> = {};
const files = existsSync(DIR)
  ? readdirSync(DIR)
      .filter((file) => file.endsWith(".json"))
      .sort()
  : [];
if (!files.length) errors.push("no rule-exception registers under docs/audits/rule-exceptions");

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(DIR, file), "utf8")) as unknown;
  const entries = entriesOf(raw);
  if (!entries.length) errors.push(`${file}: no entries`);
  for (const entry of entries) {
    const id = typeof entry.id === "string" ? entry.id : "";
    const rule = required[id];
    if (!rule) {
      errors.push(`${file}: ${id || "(missing id)"} is not an uncovered official rule`);
      continue;
    }
    if (seen.has(id)) {
      errors.push(`${id} appears in ${seen.get(id)} and ${file}`);
      continue;
    }
    seen.set(id, file);
    const status = typeof entry.status === "string" ? entry.status : "";
    if (!STATUSES.has(status)) errors.push(`${id}: invalid status ${status || "(missing)"}`);
    counts[status] = (counts[status] ?? 0) + 1;
    if (typeof entry.reason !== "string" || !entry.reason.trim()) {
      errors.push(`${id}: reason is empty`);
    }
    const source = entry.source ?? {};
    if (source.file !== rule.source.file) {
      errors.push(`${id}: source.file differs from the pinned trace (${String(source.file)})`);
    }
    if (source.revision !== rule.source.revision) {
      errors.push(
        `${id}: source.revision differs from the pinned trace (${String(source.revision)})`,
      );
    }
    if (typeof entry.statement !== "string" || !entry.statement.trim()) {
      errors.push(`${id}: statement is empty`);
    }
    if (status === "covered-but-unmapped") {
      const evidence = Array.isArray(entry.evidence)
        ? entry.evidence.filter((value): value is string => typeof value === "string").join(" | ")
        : typeof entry.evidence === "string"
          ? entry.evidence
          : "";
      if (!evidence.includes("::")) {
        errors.push(`${id}: covered-but-unmapped needs evidence of the form file::test`);
      }
    }
  }
}

for (const id of Object.keys(required)) {
  if (!seen.has(id)) errors.push(`${id}: missing from the rule-exception registers`);
}

const summary = Object.entries(counts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([status, count]) => `${status}=${count}`)
  .join(", ");
if (errors.length) {
  console.error(`rule-exception check failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error("  - " + error);
  process.exitCode = 1;
} else {
  console.log(
    `rule-exception check passed: ${Object.keys(required).length} uncovered rules, ${summary}; ${files.length} registers.`,
  );
}
