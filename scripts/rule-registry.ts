#!/usr/bin/env node
// Strict validation and legacy parity for the language-neutral rule registry.
// The supported JSON Schema subset is checked by hand below; a record passes
// only when every field, identifier, role and test reference resolves.
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
}

export type Validation = { ok: true; rules: RegistryRule[] } | { ok: false; errors: string[] };

const LEVELS: Record<string, true> = {
  verified: true,
  "implemented-unverified": true,
  "host-choice": true,
  unsupported: true,
};
const ID = /^(TB|BMR|SNV|SYS)-[A-Z0-9]+-[0-9]{2}$/;
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
    if (typeof rule.edition !== "string" || rule.edition.length < 2)
      errors.push(`${where}: invalid edition`);
    if (typeof rule.level !== "string" || LEVELS[rule.level] !== true)
      errors.push(`${where}: invalid level`);
    if (typeof rule.revision !== "string" || !REVISION.test(rule.revision))
      errors.push(`${where}: invalid revision`);
    if (typeof rule.requirement !== "string" || rule.requirement.length === 0)
      errors.push(`${where}: empty requirement`);
    if (rule.roleId !== undefined) {
      if (typeof rule.roleId !== "string" || !context.knownRoles.has(rule.roleId))
        errors.push(`${where}: unknown roleId ${String(rule.roleId)}`);
    }
    const tests: RegistryTest[] = [];
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
        if (typeof citation.file !== "string" || typeof citation.name !== "string") {
          errors.push(`${at}: file and name must be strings`);
          continue;
        }
        const names = context.tests.get(citation.file);
        if (!names) errors.push(`${at}: missing test file ${citation.file}`);
        else if (!names.has(citation.name))
          errors.push(`${at}: ${citation.file} has no test ${JSON.stringify(citation.name)}`);
        if (context.skipped.get(citation.file)?.has(citation.name))
          errors.push(`${at}: test is skipped`);
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
  let rules = 0;
  for (const file of registryFiles(join(root, "rules"))) {
    const result = validateRegistry(JSON.parse(readFileSync(file, "utf8")), context);
    if (!result.ok) {
      for (const error of result.errors) console.error(`${file}: ${error}`);
      process.exitCode = 1;
      continue;
    }
    rules += result.rules.length;
  }
  if (process.exitCode) return;
  console.log(`Rule registry check passed: ${rules} rule(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
