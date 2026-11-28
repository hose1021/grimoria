import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  citationBaselineFailures,
  citationParityFailures,
  legacyCitations,
  crossReferences,
  loadContext,
  parity,
  validateRegistry,
} from "./rule-registry.ts";
import {
  matrixSyncFailures,
  registryCitations,
  registryRequirements,
  syncMatrix,
} from "./sync-rules-matrix.ts";

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
  const edition = def.properties.edition!;
  if (edition.enum && !edition.enum.includes(entry.edition as string)) errors.push("edition");
  const citationsAt = entry.assertingTests;
  if (Array.isArray(citationsAt)) {
    const testDef = (
      schema.$defs as unknown as Record<
        string,
        { properties: Record<string, { minLength?: number }> }
      >
    ).test!;
    for (const citation of citationsAt) {
      if (typeof citation !== "object" || citation === null) {
        errors.push("test");
        continue;
      }
      const value = citation as Record<string, unknown>;
      for (const key of ["file", "name"]) {
        const spec = testDef.properties[key]!;
        const child = value[key];
        if (typeof child !== "string" || child.length < (spec.minLength ?? 0)) errors.push(key);
      }
    }
  }
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
    ["unknown edition", rule({ edition: "bogus" })],
    [
      "empty citation name",
      rule({ assertingTests: [{ file: "src/core/roles/sailor/role.test.ts", name: "" }] }),
    ],
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

test("every baseline citation is preserved exactly, with recorded corrections", () => {
  const baseline = JSON.parse(
    readFileSync(resolve(ROOT, "fixtures/conformance/baseline-rule-citations.json"), "utf8"),
  ) as { citations: Record<string, Array<{ file: string; name: string }>> };
  const corrections = JSON.parse(
    readFileSync(resolve(ROOT, "fixtures/conformance/citation-corrections.json"), "utf8"),
  ).corrections as Array<{
    id: string;
    from: { file: string; name: string };
    to: { file: string; name: string };
    reason: string;
  }>;
  const registry = new Map<string, Array<{ file: string; name: string }>>();
  for (const file of [
    ...readdirSync(resolve(ROOT, "rules/roles")).map((name) => `rules/roles/${name}`),
    "rules/shared.json",
  ]) {
    const doc = JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
    for (const rule of doc.rules) registry.set(rule.id, rule.assertingTests);
  }
  assert.deepEqual(citationParityFailures(baseline.citations, registry, corrections), []);

  const tampered = new Map(registry);
  const sailor = [...(tampered.get("BMR-SAILOR-01") ?? [])];
  const other = Object.values(baseline.citations)
    .flat()
    .find((entry) => entry.file === sailor[0]!.file && entry.name !== sailor[0]!.name);
  assert.ok(other, "the baseline must contain another test in the same file");
  tampered.set("BMR-SAILOR-01", [{ file: other.file, name: other.name }, ...sailor.slice(1)]);
  assert.ok(
    citationParityFailures(baseline.citations, tampered, corrections).some((failure) =>
      failure.startsWith("BMR-SAILOR-01: missing"),
    ),
    "a citation replaced by another test in the same file must fail",
  );
});

test("the matrix generator writes registry labels and is idempotent", () => {
  const matrix = readFileSync(resolve(ROOT, "docs/rules-matrix.md"), "utf8");
  const requirements = registryRequirements(ROOT);
  const edited = new Map(requirements);
  edited.set("BMR-SAILOR-01", "Generated sailor requirement");
  const citations = registryCitations(ROOT);
  const sync = syncMatrix(matrix, edited, citations);
  assert.ok(sync.changed >= 1);
  assert.deepEqual(matrixSyncFailures(sync.text, edited, citations), []);
  assert.equal(syncMatrix(sync.text, edited, citations).changed, 0);
  const tampered = new Map(citations);
  tampered.set("BMR-SAILOR-01", [{ file: "src/core/engine/bmr.test.ts", name: "no such test" }]);
  assert.ok(
    matrixSyncFailures(sync.text, edited, tampered).some((failure) =>
      failure.includes("citations differ"),
    ),
    "a matrix row must match the registry citations exactly",
  );
});

test("the registry rejects nested citation and ownership defects", () => {
  const accepts = (raw: unknown, extra: Record<string, unknown> = {}) =>
    validateRegistry(raw, { ...context, ...extra } as typeof context).ok;
  const withRule = (overrides: Record<string, unknown>) => ({
    schemaVersion: 1,
    rules: [rule(overrides)],
  });
  assert.equal(accepts(withRule({}), { fileRole: "sailor" }), true);
  assert.equal(
    accepts(
      withRule({ assertingTests: [{ file: "src/core/roles/sailor/role.test.ts", name: "" }] }),
    ),
    false,
    "an empty citation name",
  );
  assert.equal(
    accepts(withRule({ roleId: "imp" }), { fileRole: "sailor" }),
    false,
    "role ownership",
  );
  assert.equal(accepts(withRule({}), { shared: true }), false, "a shared file carries no roleId");
  assert.equal(accepts(withRule({ edition: "bogus" })), false, "an unknown edition");
  assert.equal(accepts(withRule({ edition: "tb" })), false, "an id outside its edition prefix");
});

test("an accepted citation baseline cannot lose entries", () => {
  const accepted = { "BMR-SAILOR-01": [{ file: "src/core/engine/bmr.test.ts", name: "old" }] };
  assert.deepEqual(citationBaselineFailures(accepted, accepted, []), []);
  assert.ok(
    citationBaselineFailures(accepted, { "BMR-SAILOR-01": [] }, []).some((failure) =>
      failure.includes("accepted citation lost"),
    ),
  );
  const corrections = [
    {
      id: "BMR-SAILOR-01",
      from: { file: "src/core/engine/bmr.test.ts", name: "old" },
      to: { file: "src/core/engine/bmr.test.ts", name: "new" },
      reason: "renamed",
    },
  ];
  assert.deepEqual(
    citationBaselineFailures(
      accepted,
      { "BMR-SAILOR-01": [{ file: "src/core/engine/bmr.test.ts", name: "new" }] },
      corrections,
    ),
    [],
  );
});

test("legacy citations come from the matrix and the old role documents", () => {
  const matrix = [
    '| `BMR-SAILOR-01` Sailor drunk | Sailor | r1768 | `src/core/engine/bmr.test.ts` "a Sailor test (BMR-SAILOR-01)" | verified |',
  ].join("\n");
  const roleDoc =
    'Edition: bmr\n\n| Rule ID | Level | Matrix revision | Asserting tests |\n| --- | --- | --- | --- |\n| BMR-SAILOR-02 | verified | r1768 | `src/core/roles/sailor/role.test.ts` "a role test (BMR-SAILOR-02)" |\n';
  const legacy = legacyCitations(matrix, new Map([["src/core/roles/sailor/rule.md", roleDoc]]));
  assert.deepEqual(
    legacy["BMR-SAILOR-01"]?.map((citation) => citation.name),
    ["a Sailor test (BMR-SAILOR-01)"],
  );
  assert.deepEqual(
    legacy["BMR-SAILOR-02"]?.map((citation) => citation.name),
    ["a role test (BMR-SAILOR-02)"],
  );
});

test("the citation legacy check fails closed on an invalid ref", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/rule-registry.ts", "--against", "ref-that-does-not-exist-519"],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cannot read the legacy rule sources/);
});

test("an applied citation correction still passes after the target branch integrated it", () => {
  const correction = {
    id: "SNV-ARTIST-01",
    from: { file: "src/core/engine/snv.test.ts", name: "old artist name" },
    to: { file: "src/core/engine/snv.test.ts", name: "new artist name" },
    reason: "renamed",
  };
  const migrated = {
    "SNV-ARTIST-01": [{ file: "src/core/engine/snv.test.ts", name: "new artist name" }],
  };
  assert.deepEqual(
    citationParityFailures(migrated, new Map([["SNV-ARTIST-01", migrated["SNV-ARTIST-01"]!]]), [
      correction,
    ]),
    [],
  );
  assert.deepEqual(
    citationParityFailures(
      { "SNV-ARTIST-01": [{ file: "src/core/engine/snv.test.ts", name: "other name" }] },
      new Map([["SNV-ARTIST-01", [{ file: "src/core/engine/snv.test.ts", name: "other name" }]]]),
      [correction],
    ).some((failure) => failure.includes("not in the baseline and it is not applied")),
    true,
  );
});

test("a duplicate citation inside one rule is rejected", () => {
  const citation = rule().assertingTests[0];
  const result = validateRegistry(
    { schemaVersion: 1, rules: [rule({ assertingTests: [citation, citation] })] },
    context,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes("duplicate citation")));
});
