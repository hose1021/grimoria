import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { crossReferences, loadContext, parity, validateRegistry } from "./rule-registry.ts";
import { matrixSyncFailures, registryRequirements } from "./sync-rules-matrix.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const context = loadContext(ROOT);
const sailor = JSON.parse(readFileSync(resolve(ROOT, "rules/roles/sailor.json"), "utf8"));

function rule(overrides: Record<string, unknown> = {}) {
  return {
    id: "BMR-SAILOR-01",
    roleId: "sailor",
    edition: "bmr",
    level: "verified",
    revision: "r1768",
    requirement: "Each night, choose an alive player.",
    assertingTests: [
      {
        file: "src/core/roles/sailor/role.test.ts",
        name: "a healthy Sailor makes the host's choice drunk until dusk (BMR-SAILOR-01, BMR-SAILOR-02)",
      },
    ],
    ...overrides,
  };
}

test("the sailor pilot validates its fields, role and test identities", () => {
  const result = validateRegistry(sailor, context);
  assert.equal(result.ok, true, result.ok ? "" : result.errors.join("; "));
  assert.deepEqual(result.ok ? result.rules.map((entry) => entry.id) : [], [
    "BMR-SAILOR-01",
    "BMR-SAILOR-02",
  ]);
});

test("an unappliable registry fails closed on ids, roles, levels, fields and tests", () => {
  const cases: Array<[string, unknown[]]> = [
    ["duplicate id", [rule(), rule()]],
    ["unknown roleId", [rule({ roleId: "notarole" })]],
    ["invalid level", [rule({ level: "covered" })]],
    ["unknown field", [{ ...rule(), note: "x" }]],
    ["missing test file", [rule({ assertingTests: [{ file: "src/missing.test.ts", name: "x" }] })]],
    [
      "dangling test name",
      [
        rule({
          assertingTests: [{ file: "src/core/roles/sailor/role.test.ts", name: "no such test" }],
        }),
      ],
    ],
  ];
  for (const [expected, rules] of cases) {
    const result = validateRegistry({ schemaVersion: 1, rules }, context);
    assert.equal(result.ok, false, expected);
    if (!result.ok) assert.ok(result.errors.length > 0, expected);
  }
});

test("every role module has a canonical registry file", () => {
  const rolesDir = resolve(ROOT, "src/core/roles");
  for (const name of readdirSync(rolesDir)) {
    if (!statSync(resolve(rolesDir, name)).isDirectory()) continue;
    assert.ok(
      existsSync(resolve(ROOT, `rules/roles/${name}.json`)),
      `${name} has no registry file`,
    );
  }
  for (const file of readdirSync(resolve(ROOT, "rules/roles"))) {
    if (!file.endsWith(".json")) continue;
    const name = file.slice(0, -".json".length);
    assert.ok(existsSync(resolve(rolesDir, name)), `${file} has no role module`);
  }
});

test("every registry requirement text matches the matrix and the exception register is intact", () => {
  const matrix = readFileSync(resolve(ROOT, "docs/rules-matrix.md"), "utf8");
  assert.deepEqual(matrixSyncFailures(matrix, registryRequirements(ROOT)), []);
  const requirements = registryRequirements(ROOT);
  assert.ok(requirements.size >= 172, `checked ${requirements.size} requirement texts`);
  const exceptionIds = new Set<string>();
  for (const name of readdirSync(resolve(ROOT, "docs/audits/rule-exceptions"))) {
    if (!name.endsWith(".json")) continue;
    const data = JSON.parse(
      readFileSync(resolve(ROOT, `docs/audits/rule-exceptions/${name}`), "utf8"),
    );
    const rules = Array.isArray(data) ? data : data.rules;
    if (!Array.isArray(rules)) continue;
    for (const entry of rules) {
      assert.ok(!exceptionIds.has(entry.id), `duplicate exception ${entry.id}`);
      exceptionIds.add(entry.id);
      assert.ok(typeof entry.status === "string" && entry.status.length > 0, `${entry.id} status`);
      assert.ok(typeof entry.reason === "string" && entry.reason.length > 0, `${entry.id} reason`);
      if (entry.evidence !== undefined) {
        const evidence = Array.isArray(entry.evidence)
          ? entry.evidence.join("\n")
          : String(entry.evidence);
        for (const match of evidence.matchAll(/test:\s*([^:]+\.test\.ts)::/g))
          assert.ok(existsSync(resolve(ROOT, match[1])), `${entry.id} -> ${match[1]}`);
      }
    }
  }
  assert.ok(exceptionIds.size > 0);
});

test("parity reports exactly the rules whose normalized rows differ", () => {
  const left = [
    {
      id: "BMR-SAILOR-01",
      roleId: "sailor",
      edition: "bmr",
      level: "verified",
      revision: "r1768",
      requirement: "Each night, choose an alive player.",
      assertingTests: [{ file: "a.test.ts", name: "one" }],
    },
  ];
  const same = [{ ...left[0], assertingTests: [{ file: "a.test.ts", name: "one" }] }];
  assert.deepEqual(parity(left, same), []);
  assert.deepEqual(parity(left, [{ ...same[0], level: "host-choice" }]), ["BMR-SAILOR-01"]);
  assert.deepEqual(parity(left, []), ["BMR-SAILOR-01"]);
});

test("cross references reject a duplicate id across files and a dangling atomic target", () => {
  const rules = (id: string) => [
    { id, edition: "bmr", level: "verified", revision: "r1", requirement: "x", assertingTests: [] },
  ];
  const files = new Map([
    ["a.json", rules("BMR-SAILOR-01")],
    ["b.json", rules("BMR-SAILOR-01")],
  ]);
  const errors = crossReferences(files, ["SYS-SETUP-01"]);
  assert.ok(errors.some((error) => error.includes("duplicate id BMR-SAILOR-01")));
  assert.ok(errors.some((error) => error.includes("SYS-SETUP-01")));
  assert.deepEqual(
    crossReferences(new Map([["a.json", rules("BMR-SAILOR-01")]]), ["BMR-SAILOR-01"]),
    [],
  );
});

const schema = JSON.parse(readFileSync(resolve(ROOT, "contracts/rule.schema.json"), "utf8")) as {
  $defs: {
    rule: {
      required: string[];
      properties: Record<
        string,
        { pattern?: string; minLength?: number; minItems?: number; enum?: string[] }
      >;
    };
  };
};

function schemaRejects(entry: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const def = schema.$defs.rule;
  for (const key of Object.keys(entry))
    if (!(key in def.properties)) errors.push(`unknown field ${key}`);
  for (const key of def.required) if (!(key in entry)) errors.push(`missing ${key}`);
  const stringField = (key: string) => {
    const spec = def.properties[key]!;
    const value = entry[key];
    if (typeof value !== "string" || value.length < (spec.minLength ?? 0)) errors.push(key);
    else if (spec.pattern && !new RegExp(spec.pattern).test(value)) errors.push(key);
  };
  if ("id" in entry) stringField("id");
  if ("roleId" in entry) stringField("roleId");
  if ("edition" in entry) stringField("edition");
  if ("revision" in entry) stringField("revision");
  if ("requirement" in entry) stringField("requirement");
  const level = def.properties.level!;
  if (!level.enum!.includes(entry.level as string)) errors.push("level");
  const tests = entry.assertingTests;
  if (!Array.isArray(tests) || tests.length < (def.properties.assertingTests!.minItems ?? 0))
    errors.push("assertingTests");
  return errors;
}

test("the runtime validator and the JSON Schema reject the same rule shapes", () => {
  const validate = (entry: Record<string, unknown>) =>
    validateRegistry({ schemaVersion: 1, rules: [entry] }, context);
  assert.equal(validate(rule()).ok, true);
  assert.deepEqual(schemaRejects(rule()), []);
  const negatives: Array<[string, Record<string, unknown>]> = [
    ["one-character revision", rule({ revision: "r" })],
    ["one-character edition", rule({ edition: "b" })],
    ["empty requirement", rule({ requirement: "" })],
    ["unknown level", rule({ level: "bogus" })],
    ["unknown field", { ...rule(), note: "x" }],
    [
      "missing edition",
      (() => {
        const rest: Record<string, unknown> = { ...rule() };
        delete rest.edition;
        return rest;
      })(),
    ],
    ["no asserting tests", rule({ assertingTests: [] })],
  ];
  for (const [name, entry] of negatives) {
    assert.equal(validate(entry).ok, false, `${name}: runtime validator accepted the shape`);
    assert.notDeepEqual(schemaRejects(entry), [], `${name}: JSON Schema accepted the shape`);
  }
});

test("every baseline matrix citation mapping is preserved", () => {
  const baseline = JSON.parse(
    readFileSync(resolve(ROOT, "fixtures/conformance/baseline-rule-citations.json"), "utf8"),
  ) as { citations: Record<string, Array<{ file: string; name: string }>> };
  const registry = new Map<string, Array<{ file: string; name: string }>>();
  for (const file of [
    ...readdirSync(resolve(ROOT, "rules/roles")).map((name) => `rules/roles/${name}`),
    "rules/shared.json",
  ]) {
    const doc = JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
    for (const rule of doc.rules) registry.set(rule.id, rule.assertingTests);
  }
  let checked = 0;
  for (const [id, citations] of Object.entries(baseline.citations)) {
    const own = registry.get(id) ?? [];
    assert.ok(
      own.length >= citations.length,
      `${id}: ${own.length} citations, baseline had ${citations.length}`,
    );
    for (const citation of citations) {
      assert.ok(
        own.some((entry) => entry.file === citation.file),
        `${id}: baseline cited ${citation.file}, the registry cites none`,
      );
      checked++;
    }
  }
  assert.ok(checked >= 400, `checked ${checked} baseline citations`);
});
