#!/usr/bin/env node
// Strict validation and legacy parity for the language-neutral rule registry.
// The supported JSON Schema subset is checked by hand below; a record passes
// only when every field, identifier, role and test reference resolves.
import { execFileSync } from "node:child_process";
import { matrixRuleRows, parseRuleDoc } from "./rule-traceability.ts";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RegistryTest {
  file: string;
  name: string;
}

export interface RegistryRule {
  id: string;
  roleId?: string;
  edition: string;
  level: string;
  revision: string;
  requirement: string;
  assertingTests: RegistryTest[];
}

export interface RegistryContext {
  knownRoles: ReadonlySet<string>;
  tests: ReadonlyMap<string, ReadonlySet<string>>;
  skipped: ReadonlyMap<string, ReadonlySet<string>>;
  fileRole?: string;
  shared?: boolean;
}

export type Validation = { ok: true; rules: RegistryRule[] } | { ok: false; errors: string[] };

const LEVELS: Record<string, true> = {
  verified: true,
  "implemented-unverified": true,
  "host-choice": true,
  unsupported: true,
};
const ID = /^(TB|BMR|SNV|SYS)-[A-Z0-9]+-[0-9]{2}$/;
const EDITION_PREFIX: Record<string, string> = { tb: "TB", bmr: "BMR", snv: "SNV", shared: "SYS" };
const REVISION = /^\S(?:.*\S)?$/;
const RULE_KEYS = new Set([
  "id",
  "roleId",
  "edition",
  "level",
  "revision",
  "requirement",
  "assertingTests",
]);
const TEST_KEYS = new Set(["file", "name"]);

export function validateRegistry(raw: unknown, context: RegistryContext): Validation {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null)
    return { ok: false, errors: ["registry is not an object"] };
  const root = raw as Record<string, unknown>;
  for (const key of Object.keys(root))
    if (key !== "schemaVersion" && key !== "rules") errors.push(`unknown root field: ${key}`);
  if (root.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!Array.isArray(root.rules))
    return { ok: false, errors: [...errors, "rules must be an array"] };
  const rules: RegistryRule[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of root.rules.entries()) {
    const where = `rules[${index}]`;
    if (typeof entry !== "object" || entry === null) {
      errors.push(`${where} is not an object`);
      continue;
    }
    const rule = entry as Record<string, unknown>;
    for (const key of Object.keys(rule))
      if (!RULE_KEYS.has(key)) errors.push(`${where}: unknown field ${key}`);
    if (typeof rule.id !== "string" || !ID.test(rule.id)) errors.push(`${where}: invalid id`);
    else if (seen.has(rule.id)) errors.push(`${where}: duplicate id ${rule.id}`);
    else seen.add(rule.id);
    if (typeof rule.edition !== "string" || !(rule.edition in EDITION_PREFIX))
      errors.push(`${where}: invalid edition`);
    else if (
      typeof rule.id === "string" &&
      ID.test(rule.id) &&
      !rule.id.startsWith(`${EDITION_PREFIX[rule.edition]}-`)
    )
      errors.push(`${where}: id does not match edition ${rule.edition}`);
    if (typeof rule.level !== "string" || LEVELS[rule.level] !== true)
      errors.push(`${where}: invalid level`);
    if (
      typeof rule.revision !== "string" ||
      !REVISION.test(rule.revision) ||
      [...rule.revision].length < 2
    )
      errors.push(`${where}: invalid revision`);
    if (typeof rule.requirement !== "string" || rule.requirement.length === 0)
      errors.push(`${where}: empty requirement`);
    if (rule.roleId !== undefined) {
      if (typeof rule.roleId !== "string" || !context.knownRoles.has(rule.roleId))
        errors.push(`${where}: unknown roleId ${String(rule.roleId)}`);
    }
    if (context.fileRole && rule.roleId !== context.fileRole)
      errors.push(`${where}: roleId must be ${context.fileRole} in this file`);
    if (context.shared && rule.roleId !== undefined)
      errors.push(`${where}: shared rules carry no roleId`);
    const tests: RegistryTest[] = [];
    const citationKeys = new Set<string>();
    if (!Array.isArray(rule.assertingTests) || rule.assertingTests.length === 0)
      errors.push(`${where}: no assertingTests`);
    else
      for (const [testIndex, test] of rule.assertingTests.entries()) {
        const at = `${where}.assertingTests[${testIndex}]`;
        if (typeof test !== "object" || test === null) {
          errors.push(`${at} is not an object`);
          continue;
        }
        const citation = test as Record<string, unknown>;
        for (const key of Object.keys(citation))
          if (!TEST_KEYS.has(key)) errors.push(`${at}: unknown field ${key}`);
        if (
          typeof citation.file !== "string" ||
          typeof citation.name !== "string" ||
          citation.file.length === 0 ||
          citation.name.length === 0
        ) {
          errors.push(`${at}: file and name must be non-empty strings`);
          continue;
        }
        const names = context.tests.get(citation.file);
        if (!names) errors.push(`${at}: missing test file ${citation.file}`);
        else if (!names.has(citation.name))
          errors.push(`${at}: ${citation.file} has no test ${JSON.stringify(citation.name)}`);
        if (context.skipped.get(citation.file)?.has(citation.name))
          errors.push(`${at}: test is skipped`);
        const citationKey = citation.file + "\0" + citation.name;
        if (citationKeys.has(citationKey))
          errors.push(`${at}: duplicate citation ${citation.file} "${citation.name}"`);
        citationKeys.add(citationKey);
        tests.push({ file: citation.file, name: citation.name });
      }
    if (errors.length) continue;
    rules.push({
      id: rule.id as string,
      ...(rule.roleId === undefined ? {} : { roleId: rule.roleId as string }),
      edition: rule.edition as string,
      level: rule.level as string,
      revision: rule.revision as string,
      requirement: rule.requirement as string,
      assertingTests: tests,
    });
  }
  return errors.length ? { ok: false, errors } : { ok: true, rules };
}

export interface CitationCorrection {
  id: string;
  from: { file: string; name: string };
  to: { file: string; name: string };
  reason: string;
}

export function correctionUniquenessFailures(corrections: readonly CitationCorrection[]): string[] {
  const keys = new Set<string>();
  const failures: string[] = [];
  for (const correction of corrections) {
    const key = correction.id + "\0" + correction.from.file + "\0" + correction.from.name;
    if (keys.has(key))
      failures.push(
        `${correction.id}: duplicate correction for ${correction.from.file} "${correction.from.name}"`,
      );
    keys.add(key);
  }
  return failures;
}

export function citationParityFailures(
  baseline: Record<string, Array<{ file: string; name: string }>>,
  registry: ReadonlyMap<string, Array<{ file: string; name: string }>>,
  corrections: readonly CitationCorrection[],
): string[] {
  const failures: string[] = [];
  const byId = new Map(corrections.map((correction) => [correction.id, correction]));
  for (const [id, citations] of Object.entries(baseline)) {
    const own = registry.get(id) ?? [];
    const correction = byId.get(id);
    for (const citation of citations) {
      const corrected =
        correction &&
        correction.from.file === citation.file &&
        correction.from.name === citation.name
          ? correction.to
          : citation;
      if (!own.some((entry) => entry.file === corrected.file && entry.name === corrected.name))
        failures.push(`${id}: missing ${corrected.file} "${corrected.name}"`);
    }
    if (correction) {
      const hasSource = citations.some(
        (entry) => entry.file === correction.from.file && entry.name === correction.from.name,
      );
      const hasTarget = citations.some(
        (entry) => entry.file === correction.to.file && entry.name === correction.to.name,
      );
      if (!hasSource && !hasTarget)
        failures.push(`${id}: correction source is not in the baseline and it is not applied`);
      if (
        !own.some((entry) => entry.file === correction.to.file && entry.name === correction.to.name)
      )
        failures.push(`${id}: correction target is missing from the registry`);
    }
  }
  return failures;
}

export function legacyCitations(
  matrix: string,
  ruleDocs: ReadonlyMap<string, string>,
): Record<string, Array<{ file: string; name: string }>> {
  const cellsOf = (line: string): string[] | null => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
    return trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
  };
  const out: Record<string, Array<{ file: string; name: string }>> = {};
  for (const row of matrixRuleRows(
    matrix
      .split("\n")
      .map(cellsOf)
      .filter((cells) => cells !== null),
  )) {
    if (row.id === null) continue;
    out[row.id] ??= [];
    out[row.id].push(...row.citations);
  }
  for (const source of ruleDocs.values())
    for (const rule of parseRuleDoc(source).rules) {
      out[rule.id] ??= [];
      out[rule.id].push(...rule.citations);
    }
  for (const [id, citations] of Object.entries(out)) {
    const seen = new Set<string>();
    out[id] = citations.filter((citation) => {
      const key = citation.file + "\0" + citation.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return out;
}

export function citationBaselineFailures(
  accepted: Record<string, Array<{ file: string; name: string }>>,
  current: Record<string, Array<{ file: string; name: string }>>,
  corrections: readonly CitationCorrection[],
): string[] {
  const failures: string[] = [];
  const byId = new Map(corrections.map((correction) => [correction.id, correction]));
  for (const [id, citations] of Object.entries(accepted)) {
    const own = current[id] ?? [];
    const correction = byId.get(id);
    for (const citation of citations) {
      const expected =
        correction &&
        correction.from.file === citation.file &&
        correction.from.name === citation.name
          ? correction.to
          : citation;
      if (!own.some((entry) => entry.file === expected.file && entry.name === expected.name))
        failures.push(`${id}: accepted citation lost: ${citation.file} "${citation.name}"`);
    }
  }
  return failures;
}

export function parity(legacy: RegistryRule[], registry: RegistryRule[]): string[] {
  const key = (rule: RegistryRule) =>
    JSON.stringify({
      ...rule,
      assertingTests: [...rule.assertingTests].sort((a, b) =>
        (a.file + a.name).localeCompare(b.file + b.name),
      ),
    });
  const left = new Map(legacy.map((rule) => [rule.id, key(rule)]));
  const right = new Map(registry.map((rule) => [rule.id, key(rule)]));
  const differences = new Set<string>();
  for (const [id, value] of left) if (right.get(id) !== value) differences.add(id);
  for (const id of right.keys()) if (!left.has(id)) differences.add(id);
  return [...differences].sort();
}

export function crossReferences(
  files: ReadonlyMap<string, RegistryRule[]>,
  atomicTargets: readonly string[],
): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  for (const [path, rules] of files) {
    for (const rule of rules) {
      const prior = seen.get(rule.id);
      if (prior) errors.push(`duplicate id ${rule.id}: ${prior} and ${path}`);
      else seen.set(rule.id, path);
    }
  }
  for (const target of atomicTargets)
    if (!seen.has(target)) errors.push(`atomic map target ${target} has no registry rule`);
  return errors;
}

export function loadContext(root: string): RegistryContext {
  const data = JSON.parse(
    readFileSync(join(root, "docs/audits/verification-gates/test-manifest.json"), "utf8"),
  ) as {
    tests: Array<{ file: string; name: string; skipped?: true }>;
  };
  const tests = new Map<string, Set<string>>();
  const skipped = new Map<string, Set<string>>();
  for (const test of data.tests) {
    if (!tests.has(test.file)) tests.set(test.file, new Set());
    tests.get(test.file)!.add(test.name);
    if (test.skipped) {
      if (!skipped.has(test.file)) skipped.set(test.file, new Set());
      skipped.get(test.file)!.add(test.name);
    }
  }
  const rolesDir = join(root, "src/core/roles");
  const knownRoles = new Set(
    readdirSync(rolesDir).filter((name) => {
      try {
        return statSync(join(rolesDir, name, "role.ts")).isFile();
      } catch {
        return false;
      }
    }),
  );
  return { knownRoles, tests, skipped };
}

function registryFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...registryFiles(path));
    else if (entry.endsWith(".json")) out.push(path);
  }
  return out.sort();
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const context = loadContext(root);
  const validated = new Map<string, RegistryRule[]>();
  for (const file of registryFiles(join(root, "rules"))) {
    const relative = file
      .slice(join(root, "rules").length + 1)
      .split("\\")
      .join("/");
    const ownership = relative.startsWith("roles/")
      ? { fileRole: relative.replace(/^roles\//, "").replace(/\.json$/, "") }
      : relative === "shared.json"
        ? { shared: true }
        : {};
    const result = validateRegistry(JSON.parse(readFileSync(file, "utf8")), {
      ...context,
      ...ownership,
    });
    if (!result.ok) {
      for (const error of result.errors) console.error(`${file}: ${error}`);
      process.exitCode = 1;
      continue;
    }
    validated.set(file, result.rules);
  }
  const atomic = JSON.parse(
    readFileSync(join(root, "docs/audits/verification-gates/atomic-map.json"), "utf8"),
  ) as { rules: Record<string, string[]> };
  const targets = [...new Set(Object.values(atomic.rules).flat())];
  for (const error of crossReferences(validated, targets)) {
    console.error(error);
    process.exitCode = 1;
  }
  if (process.exitCode) return;
  const againstIndex = process.argv.indexOf("--against");
  if (againstIndex >= 0) {
    const ref = process.argv[againstIndex + 1];
    if (!ref) {
      console.error("--against needs a git ref");
      process.exitCode = 1;
      return;
    }
    let matrixText: string;
    try {
      execFileSync("git", ["rev-parse", "--verify", ref], { cwd: root, stdio: "ignore" });
      matrixText = execFileSync("git", ["show", `${ref}:docs/rules-matrix.md`], {
        cwd: root,
        encoding: "utf8",
      });
    } catch (error) {
      console.error(`cannot read the legacy rule sources at ${ref}: ${String(error)}`);
      process.exitCode = 1;
      return;
    }
    const ruleDocs = new Map<string, string>();
    try {
      const listing = execFileSync(
        "git",
        ["ls-tree", "-r", "--name-only", ref, "--", "src/core/roles"],
        { cwd: root, encoding: "utf8" },
      );
      for (const file of listing.split("\n").filter((entry) => entry.endsWith("/rule.md"))) {
        ruleDocs.set(
          file,
          execFileSync("git", ["show", `${ref}:${file}`], { cwd: root, encoding: "utf8" }),
        );
      }
    } catch (error) {
      console.error(`cannot read the legacy role documents at ${ref}: ${String(error)}`);
      process.exitCode = 1;
      return;
    }
    const legacy = legacyCitations(matrixText, ruleDocs);
    const registry = new Map<string, Array<{ file: string; name: string }>>();
    for (const rule of [...validated.values()].flat()) registry.set(rule.id, rule.assertingTests);
    const corrections = (
      JSON.parse(
        readFileSync(join(root, "fixtures/conformance/citation-corrections.json"), "utf8"),
      ) as { corrections: CitationCorrection[] }
    ).corrections;
    const duplicateCorrections = correctionUniquenessFailures(corrections);
    const failures = [
      ...duplicateCorrections,
      ...citationParityFailures(legacy, registry, corrections),
    ];
    if (failures.length) {
      for (const failure of failures) console.error(failure);
      console.error(`citation legacy parity failed for ${failures.length} citation(s)`);
      process.exitCode = 1;
      return;
    }
    console.log(`Citation legacy parity passed: ${Object.keys(legacy).length} rules at ${ref}.`);
  }
  const rules = [...validated.values()].reduce((sum, list) => sum + list.length, 0);
  console.log(`Rule registry check passed: ${rules} rule(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
