import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { crossReferences, loadContext, parity, validateRegistry } from "./rule-registry.ts";
import { requirementLabels } from "./rule-registry-export.ts";
import { parseRuleDoc } from "./rule-traceability.ts";

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

test("every registry row matches its legacy document on id, level, revision and tests", () => {
  const rolesDir = resolve(ROOT, "src/core/roles");
  let checked = 0;
  const names = readdirSync(rolesDir).sort();
  for (const name of names) {
    const rulePath = resolve(rolesDir, name, "rule.md");
    if (!existsSync(rulePath)) continue;
    const legacy = parseRuleDoc(readFileSync(rulePath, "utf8"));
    const registry = JSON.parse(readFileSync(resolve(ROOT, `rules/roles/${name}.json`), "utf8"));
    assert.deepEqual(
      registry.rules.map((entry: { id: string }) => entry.id),
      legacy.rules.map((entry) => entry.id),
      name,
    );
    for (const row of legacy.rules) {
      const entry = registry.rules.find((candidate: { id: string }) => candidate.id === row.id);
      assert.equal(entry.level, row.level, `${name} ${row.id} level`);
      assert.equal(entry.edition, legacy.edition ?? "shared", `${name} ${row.id} edition`);
      assert.equal(entry.revision, row.revision, `${name} ${row.id} revision`);
      assert.deepEqual(entry.assertingTests, row.citations, `${name} ${row.id} tests`);
      checked++;
    }
  }
  const sharedLegacy = parseRuleDoc(readFileSync(resolve(ROOT, "docs/rules-shared.md"), "utf8"));
  const sharedRegistry = JSON.parse(readFileSync(resolve(ROOT, "rules/shared.json"), "utf8"));
  assert.deepEqual(
    sharedRegistry.rules.map((entry: { id: string }) => entry.id),
    sharedLegacy.rules.map((entry) => entry.id),
  );
  assert.ok(checked > 100, `checked ${checked} role rows`);
});

test("every registry requirement text matches the matrix and the exception register is intact", () => {
  const labels = requirementLabels(readFileSync(resolve(ROOT, "docs/rules-matrix.md"), "utf8"));
  const files = [
    ...readdirSync(resolve(ROOT, "rules/roles"))
      .filter((name) => name.endsWith(".json"))
      .map((name) => `rules/roles/${name}`),
    "rules/shared.json",
  ];
  let checked = 0;
  for (const file of files) {
    const registry = JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
    for (const entry of registry.rules) {
      assert.equal(entry.requirement, labels.get(entry.id), `${entry.id} requirement text`);
      checked++;
    }
  }
  assert.ok(checked >= 172, `checked ${checked} requirement texts`);
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
