#!/usr/bin/env node
// Build the per-script readiness matrix from the trace and the documented
// exception registers. It does not re-derive rules; it makes the current
// evidence status readable without claiming 523/523.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  badMoonRisingScript,
  sectsAndVioletsScript,
  troubleBrewingScript,
} from "../src/core/model/scripts.ts";
import type { Script } from "../src/core/model/types.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const GATE = join(ROOT, "docs", "audits", "verification-gates");
const EXCEPTIONS = join(ROOT, "docs", "audits", "rule-exceptions");
const OUT = join(ROOT, "docs", "audits", "release-readiness.md");

interface TraceRule {
  id: string;
  statement: string;
  status: string;
  role: string | null;
  category: string;
  engineRuleIds: string[];
  uiContractIds: string[];
  source: { page: string; revision: number };
}

interface ExceptionEntry {
  id?: unknown;
  status?: unknown;
  reason?: unknown;
}

type Outcome =
  | "verified"
  | "partial"
  | "non-mechanical-exception"
  | "mechanical-gap"
  | "covered-but-unmapped"
  | "unmapped";

const trace = JSON.parse(readFileSync(join(GATE, "traceability.json"), "utf8")) as {
  officialRules: TraceRule[];
};

const exceptions = new Map<string, { status: Outcome; reason: string }>();
if (readdirSync(EXCEPTIONS).some((file) => file.endsWith(".json"))) {
  for (const file of readdirSync(EXCEPTIONS).filter((name) => name.endsWith(".json"))) {
    const raw = JSON.parse(readFileSync(join(EXCEPTIONS, file), "utf8")) as unknown;
    const entries: ExceptionEntry[] = Array.isArray(raw)
      ? (raw as ExceptionEntry[])
      : raw && typeof raw === "object" && "rules" in raw && Array.isArray(raw.rules)
        ? (raw.rules as ExceptionEntry[])
        : [];
    for (const entry of entries) {
      if (typeof entry.id !== "string") continue;
      exceptions.set(entry.id, {
        status: (entry.status as Outcome) ?? "unmapped",
        reason: typeof entry.reason === "string" ? entry.reason : "",
      });
    }
  }
}

function outcomeOf(rule: TraceRule): Outcome {
  if (rule.status === "ENGINE_VERIFIED") return "verified";
  if (rule.status === "ENGINE_PARTIAL") return "partial";
  return exceptions.get(rule.id)?.status ?? "unmapped";
}

const scripts: Script[] = [troubleBrewingScript(), badMoonRisingScript(), sectsAndVioletsScript()];

const counts = (rules: TraceRule[]) => {
  const result: Record<Outcome, number> = {
    verified: 0,
    partial: 0,
    "non-mechanical-exception": 0,
    "mechanical-gap": 0,
    "covered-but-unmapped": 0,
    unmapped: 0,
  };
  for (const rule of rules) result[outcomeOf(rule)] += 1;
  return result;
};

const lines: string[] = [
  "# Release readiness matrix",
  "",
  "Generated from `docs/audits/verification-gates/traceability.json` and",
  "`docs/audits/rule-exceptions/*.json`. A `verified` row is sentence-mapped and",
  "has an executing named test; `partial` is a host-choice rule; the exception",
  "rows carry their pinned source and reason in the registers. This is not a",
  "523/523 claim.",
  "",
];

const shared = trace.officialRules.filter((rule) => rule.role === null);
const sharedCounts = counts(shared);
lines.push("## Shared rules", "", "| Outcome | Rules |", "| --- | ---: |");
for (const [name, value] of Object.entries(sharedCounts)) {
  if (value) lines.push(`| ${name} | ${value} |`);
}
lines.push("");

const normalizeRole = (id: string): string => id.replace(/-/g, "");

for (const script of scripts) {
  const roles = new Set(script.roles.map(normalizeRole));
  const rules = trace.officialRules.filter(
    (rule) => rule.role && roles.has(normalizeRole(rule.role)),
  );
  const total = counts(rules);
  lines.push(`## ${script.name}`, "", "| Outcome | Rules |", "| --- | ---: |");
  for (const [name, value] of Object.entries(total)) {
    if (value) lines.push(`| ${name} | ${value} |`);
  }
  lines.push(
    "",
    "| Role | Verified | Partial | Non-mechanical | Mechanical gap | Covered/unmapped |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const roleId of [...script.roles].sort()) {
    const roleRules = rules.filter(
      (rule) => rule.role && normalizeRole(rule.role) === normalizeRole(roleId),
    );
    if (!roleRules.length) continue;
    const roleCounts = counts(roleRules);
    lines.push(
      `| ${roleId} | ${roleCounts.verified} | ${roleCounts.partial} | ${roleCounts["non-mechanical-exception"]} | ${roleCounts["mechanical-gap"]} | ${roleCounts["covered-but-unmapped"] + roleCounts.unmapped} |`,
    );
  }
  lines.push("");
}

const all = counts(trace.officialRules);
lines.push("## Total", "", "| Outcome | Rules |", "| --- | ---: |");
for (const [name, value] of Object.entries(all)) {
  lines.push(`| ${name} | ${value} |`);
}
lines.push(
  "## Partially confirmed rules",
  "",
  "These 12 rules have an executing host-choice engine rule; the register records whether the remaining clause is evidenced or a mechanical gap.",
  "",
  "| Rule | Role | Status | Reason |",
  "| --- | --- | --- | --- |",
);
for (const rule of trace.officialRules.filter((entry) => entry.status === "ENGINE_PARTIAL")) {
  const entry = exceptions.get(rule.id);
  const reason = (entry?.reason ?? "no register entry").replace(/\|/g, "\\|");
  lines.push(
    `| ${rule.id} | ${rule.role ?? "shared"} | ${entry?.status ?? "unmapped"} | ${reason} |`,
  );
}
lines.push(
  "",
  "Mechanical gaps are open engineering work. Non-mechanical exceptions carry",
  "an official source and a reason in the registers. `unmapped` means the",
  "register is incomplete and the checker must fail.",
  "",
);

writeFileSync(OUT, lines.join("\n"));
console.log(`Wrote ${OUT}`);
