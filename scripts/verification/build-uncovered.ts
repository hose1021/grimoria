#!/usr/bin/env node
// Every rule and UI contract that is not covered by a passing, gate-enforced
// test is recorded here with a reason and, where one exists, the issue that
// must close the gap. This is a register, not an allowlist: the findings gate
// still fails while any UI contract is non-compliant or only static.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIR = join(ROOT, "docs", "audits", "verification-gates");
const TRACE = join(DIR, "traceability.json");
const OUT = join(DIR, "uncovered.json");

interface UiContract {
  id: string;
  status: string;
  evidence: string;
  note: string;
}

interface OfficialRule {
  id: string;
  category: string;
  status: string;
  mapping: string;
  uiCoverage: string;
  engineRuleIds: string[];
}

interface EngineRule {
  id: string;
  level: string;
  role: string | null;
}

interface Trace {
  officialRules: OfficialRule[];
  engineRules: EngineRule[];
  uiContracts: UiContract[];
}

const UI_ISSUES: Record<string, string> = {
  "UI-021": "#328",
  "UI-023": "#324",
  "UI-035": "#318",
  "UI-041": "#322",
  "UI-045": "#319, #325",
  "UI-048": "#317",
  "UI-049": "#322",
  "UI-051": "#313",
  "UI-053": "#320",
  "UI-057": "#320",
  "UI-061": "#320",
  "UI-063": "#325",
  "UI-074": "#331",
  "UI-080": "#326",
  "UI-081": "#329, #331",
  "UI-082": "#330",
  "UI-083": "#331",
  "UI-084": "#331",
  "UI-085": "#331",
  "UI-086": "#331",
};

const UI_REASONS: Record<string, string> = {
  "UI-021":
    "Mid-game seat reorder is an app-contract escape hatch; official circle is fixed. Owner decision required.",
  "UI-023":
    "The done mark and option list are UI-local copies; they can disagree with secretsErrors.",
  "UI-035": "skipStep accepts mandatory steps; Po no-one is not recorded.",
  "UI-041": "infoTemplate is one string for the whole table.",
  "UI-045": "Klutz day choice and Witch curse have no UI control.",
  "UI-048": "survives is offered without a living healthy Pacifist.",
  "UI-049": "executeTarget/executeSurvives are not cleared by day.",
  "UI-051": "Engine #313: day path reads alive; UI follows registersAlive.",
  "UI-053": "Borrowed Slayer is rejected/not offered.",
  "UI-057": "Borrowed Juggler is not offered by the panel.",
  "UI-061": "Borrowed Tinker is rejected/not offered.",
  "UI-063": "Correction dialog omits effect/shown.",
  "UI-074": "Combined drunk+poisoned is shown as one badge.",
  "UI-080": "Role-catalog semantics and hardcoded copy.",
  "UI-081": "Demon/Minion info and day-form/survival conditions are computed in UI.",
  "UI-082": "setNotes dispatches per character.",
  "UI-083": "publicSnapshot duplicates publicGameView.",
  "UI-084": "QueuePanel is unreachable.",
  "UI-085": "RoleCard hidden mode is unreachable.",
  "UI-086": "publicRoleView is unreachable.",
};

function build(): unknown {
  if (!existsSync(TRACE)) throw new Error("traceability.json is missing");
  const trace = JSON.parse(readFileSync(TRACE, "utf8")) as Trace;
  const officialRules = trace.officialRules
    .filter((rule) => rule.status !== "ENGINE_VERIFIED" || rule.uiCoverage !== "UI_COVERED")
    .map((rule) => ({
      id: rule.id,
      category: rule.category,
      status: rule.status,
      mapping: rule.mapping,
      uiCoverage: rule.uiCoverage,
      engineRuleIds: rule.engineRuleIds,
      reason:
        rule.mapping === "role-level"
          ? "Only a role/topic-level mapping exists; no explicit official-rule to engine-rule entry, so the rule is not verified."
          : rule.status === "ENGINE_PARTIAL"
            ? "At least one mapped engine row is a Storyteller choice; the engine offers the legal options."
            : rule.status === "ENGINE_UNVERIFIED"
              ? "The mapped engine row is implemented-unverified or unsupported."
              : rule.uiCoverage === "NO_UI_CONTRACT"
                ? "Engine-only rule; no dedicated UI surface."
                : "The mapped UI contract is a candidate only, or is not COMPLIANT.",
      task:
        rule.mapping === "role-level"
          ? "add an explicit atomic-map entry after reading the official text and the engine row requirement."
          : rule.uiCoverage === "NO_UI_CONTRACT"
            ? "none while the rule has no UI surface; add a UI contract if a surface appears."
            : "close the linked UI issue and add a regression test.",
    }));
  const engineRules = trace.engineRules
    .filter((rule) => rule.level !== "verified")
    .map((rule) => ({
      id: rule.id,
      level: rule.level,
      role: rule.role,
      reason:
        rule.level === "host-choice"
          ? "Storyteller decision; engine offers legal options where a surface exists."
          : rule.level === "implemented-unverified"
            ? "Implemented but not independently asserted; owner/test required."
            : "Unsupported; host resolves outside the engine.",
      task:
        rule.level === "host-choice"
          ? "none; host-choice row."
          : "add an asserting test or record the owner decision.",
    }));
  const uiContracts = trace.uiContracts
    .filter(
      (contract) =>
        contract.status !== "COMPLIANT" ||
        ["STATIC_VERIFIED", "UNREACHABLE", "OUT_OF_SCOPE"].includes(contract.evidence),
    )
    .map((contract) => ({
      id: contract.id,
      status: contract.status,
      evidence: contract.evidence,
      issue: UI_ISSUES[contract.id] ?? null,
      reason:
        UI_REASONS[contract.id] ??
        (contract.evidence === "STATIC_VERIFIED"
          ? "Static review only; needs a contract/component/browser test."
          : contract.note || contract.status),
      task:
        contract.evidence === "STATIC_VERIFIED"
          ? "add a selector/component/browser test."
          : "close the linked issue and add a regression test.",
    }));
  return {
    version: 1,
    sources: ["docs/audits/verification-gates/traceability.json"],
    officialRules,
    engineRules,
    uiContracts,
    summary: {
      officialRulesWithoutUi: officialRules.length,
      weakEngineRules: engineRules.length,
      uiContractsNotGateCovered: uiContracts.length,
    },
  };
}

function main(): void {
  const value = build();
  const text = JSON.stringify(value, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (!existsSync(OUT)) {
      console.error("uncovered.json is missing; run node scripts/verification/build-uncovered.ts");
      process.exit(1);
    }
    if (readFileSync(OUT, "utf8") !== text) {
      console.error("uncovered.json is stale; run node scripts/verification/build-uncovered.ts");
      process.exit(1);
    }
    console.log(
      `Uncovered register is current: ${JSON.parse(text).summary.uiContractsNotGateCovered} UI contracts, ${JSON.parse(text).summary.weakEngineRules} engine rules.`,
    );
    return;
  }
  writeFileSync(OUT, text);
  console.log(`Wrote ${OUT}`);
  console.log(JSON.stringify(JSON.parse(text).summary, null, 2));
}

main();
