import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadContext, parity, validateRegistry } from "./rule-registry.ts";
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
