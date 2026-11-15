import test from "node:test";
import assert from "node:assert/strict";

import { parseRuleDoc, traceabilityFailures } from "./rule-traceability.ts";
import type { RuleRow } from "./rule-traceability.ts";

const FILE = "src/core/engine/engine.test.ts";

function row(role: string, revision: string, level: string, names: string[], id: string): string[] {
  const first = `\`${role}\` \`${id}\` [${revision}](https://wiki.example/${role}&oldid=${revision.slice(1)})`;
  const tests = names.map((name) => `\`${FILE}\` "${name}"`).join("; ");
  return [first, "rule text", "engine", "host", tests, level];
}

function doc(
  role: string,
  edition: string | null,
  rules: RuleRow[],
): { edition: string | null; role: string; rules: RuleRow[] } {
  return { role, edition, rules };
}

function failures({
  rows,
  docs,
}: {
  docs: { edition: string | null; role: string; rules: RuleRow[] }[];
  rows: string[][];
}) {
  return traceabilityFailures({
    matrixRows: rows,
    docs,
    editionOf: (role) =>
      role === "washerwoman" || role === "empath" ? "tb" : role === "po" ? "bmr" : "snv",
  });
}

test("a verified row whose test carries its declared identifier passes", () => {
  assert.deepEqual(
    failures({
      rows: [
        row(
          "washerwoman",
          "r2630",
          "verified",
          ["one of two (TB-WASHERWOMAN-01)"],
          "TB-WASHERWOMAN-01",
        ),
      ],
      docs: [
        doc("washerwoman", "tb", [
          {
            id: "TB-WASHERWOMAN-01",
            level: "verified",
            revision: "r2630",
            citations: [{ file: FILE, name: "one of two (TB-WASHERWOMAN-01)" }],
          },
        ]),
      ],
    }),
    [],
  );
});

test("a verified row whose test carries no identifier fails", () => {
  const out = failures({
    rows: [row("washerwoman", "r2630", "verified", ["one of two"], "TB-WASHERWOMAN-01")],
    docs: [
      doc("washerwoman", "tb", [
        { id: "TB-WASHERWOMAN-01", level: "verified", revision: "r2630", citations: [] },
      ]),
    ],
  });
  assert.equal(out.length, 1);
  assert.match(out[0], /carries no rule identifier/);
});

test("a test that carries an undeclared identifier fails", () => {
  const out = failures({
    rows: [
      row("washerwoman", "r2630", "verified", ["one of two (TB-CHEF-01)"], "TB-WASHERWOMAN-01"),
    ],
    docs: [
      doc("washerwoman", "tb", [
        { id: "TB-WASHERWOMAN-01", level: "verified", revision: "r2630", citations: [] },
      ]),
    ],
  });
  assert.equal(out.length, 2);
  assert.match(out.join("\n"), /not declared in the rule documents \(TB-CHEF-01\)/);
  assert.match(out.join("\n"), /none of which carries TB-WASHERWOMAN-01/);
});

test("the same identifier declared by two roles fails", () => {
  const out = failures({
    rows: [
      row(
        "washerwoman",
        "r2630",
        "verified",
        ["one of two (TB-WASHERWOMAN-01)"],
        "TB-WASHERWOMAN-01",
      ),
      row("empath", "r1724", "verified", ["two alive (TB-WASHERWOMAN-01)"], "TB-WASHERWOMAN-01"),
    ],
    docs: [
      doc("washerwoman", "tb", [
        { id: "TB-WASHERWOMAN-01", level: "verified", revision: "r2630", citations: [] },
      ]),
      doc("empath", "tb", [
        { id: "TB-WASHERWOMAN-01", level: "verified", revision: "r1724", citations: [] },
      ]),
    ],
  });
  assert.match(out.join("\n"), /TB-WASHERWOMAN-01 is declared in/);
});

test("a rule whose matrix revision disappeared fails", () => {
  const out = failures({
    rows: [
      row(
        "washerwoman",
        "r2630",
        "verified",
        ["one of two (TB-WASHERWOMAN-01)"],
        "TB-WASHERWOMAN-01",
      ),
    ],
    docs: [
      doc("washerwoman", "tb", [
        { id: "TB-WASHERWOMAN-01", level: "verified", revision: "r9999", citations: [] },
      ]),
    ],
  });
  assert.equal(out.length, 1);
  assert.match(out[0], /references matrix row r2630, but washerwoman\/rule\.md names r9999/);
});

test("a verified row that documents its rule as a host choice fails", () => {
  const out = failures({
    rows: [
      row(
        "washerwoman",
        "r2630",
        "verified",
        ["one of two (TB-WASHERWOMAN-01)"],
        "TB-WASHERWOMAN-01",
      ),
      row("washerwoman", "r2630", "host-choice", ["false info"], "TB-WASHERWOMAN-02"),
    ],
    docs: [
      doc("washerwoman", "tb", [
        { id: "TB-WASHERWOMAN-01", level: "host-choice", revision: "r2630", citations: [] },
        { id: "TB-WASHERWOMAN-02", level: "verified", revision: "r2630", citations: [] },
      ]),
    ],
  });
  assert.equal(out.length, 2);
  assert.match(out.join("\n"), /TB-WASHERWOMAN-01 is verified in the matrix and host-choice/);
  assert.match(out.join("\n"), /TB-WASHERWOMAN-02 is host-choice in the matrix and verified/);
});

test("a role document with a different row count than the matrix fails", () => {
  const out = failures({
    rows: [
      row(
        "washerwoman",
        "r2630",
        "verified",
        ["one of two (TB-WASHERWOMAN-01)"],
        "TB-WASHERWOMAN-01",
      ),
      row("washerwoman", "r2630", "host-choice", ["false info"], "TB-WASHERWOMAN-02"),
    ],
    docs: [
      doc("washerwoman", "tb", [
        { id: "TB-WASHERWOMAN-01", level: "verified", revision: "r2630", citations: [] },
      ]),
    ],
  });
  assert.match(out.join("\n"), /lists 1 rules, the matrix has 2 rows/);
});

test("a role document with the wrong edition fails", () => {
  const out = failures({
    rows: [
      row(
        "washerwoman",
        "r2630",
        "verified",
        ["one of two (TB-WASHERWOMAN-01)"],
        "TB-WASHERWOMAN-01",
      ),
    ],
    docs: [
      doc("washerwoman", "bmr", [
        { id: "TB-WASHERWOMAN-01", level: "verified", revision: "r2630", citations: [] },
      ]),
    ],
  });
  assert.equal(out.length, 1);
  assert.match(out[0], /says edition bmr/);
});

test("a rule document parses its edition and table", () => {
  const parsed = parseRuleDoc(`# chef

Edition: tb

| Rule ID | Level | Matrix revision | Asserting tests |
| --- | --- | --- | --- |
| TB-CHEF-01 | verified | r2510 | \`${FILE}\` "pairs (TB-CHEF-01)" |
`);
  assert.equal(parsed.edition, "tb");
  assert.deepEqual(parsed.rules, [
    {
      id: "TB-CHEF-01",
      level: "verified",
      revision: "r2510",
      citations: [{ file: FILE, name: "pairs (TB-CHEF-01)" }],
    },
  ]);
});
