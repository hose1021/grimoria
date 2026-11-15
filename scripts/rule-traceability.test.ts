import test from "node:test";
import assert from "node:assert/strict";

import { traceabilityFailures } from "./rule-traceability.ts";
import type { RuleRow } from "./rule-traceability.ts";

const FILE = "src/core/engine/engine.test.ts";
const SHARED_FILE = "src/core/engine/commands.test.ts";

function citations(names: string[], file = FILE) {
  return names.map((name) => ({ file, name }));
}

function row(
  role: string,
  revision: string,
  level: string,
  names: string[],
  id?: string,
): string[] {
  const link = `[${revision}](https://wiki.example/${role}&oldid=${revision.slice(1)})`;
  const first = id ? `\`${role}\` \`${id}\` ${link}` : `\`${role}\` ${link}`;
  const tests = citations(names)
    .map((citation) => `\`${citation.file}\` "${citation.name}"`)
    .join("; ");
  return [first, "rule text", "engine", "host", tests, level];
}

function sharedRow(id: string, level: string, names: string[]): string[] {
  const tests = citations(names, SHARED_FILE)
    .map((citation) => `\`${citation.file}\` "${citation.name}"`)
    .join("; ");
  return [id + " rule", "engine", tests, level];
}

function rule(id: string, level: string, revision: string, names: string[]): RuleRow {
  return { id, level, revision, citations: citations(names) };
}

function failures({
  rows,
  docs = [],
  shared = [],
}: {
  docs?: { edition: string | null; role: string; rules: RuleRow[] }[];
  rows: string[][];
  shared?: RuleRow[];
}) {
  return traceabilityFailures({
    matrixRows: rows,
    docs,
    shared,
    editionOf: (role) => (role === "washerwoman" || role === "empath" ? "tb" : "snv"),
  });
}

test("a matrix row without an identifier fails", () => {
  const out = failures({
    rows: [row("washerwoman", "r2630", "verified", ["one of two"])],
    docs: [
      {
        role: "washerwoman",
        edition: "tb",
        rules: [rule("TB-WASHERWOMAN-01", "verified", "r2630", ["one of two"])],
      },
    ],
  });
  assert.match(out.join("\n"), /carries 0 rule identifiers, expected exactly one/);
});

test("a declared identifier without a matrix row fails", () => {
  const out = failures({
    rows: [sharedRow("SYS-EFFECTS-01", "verified", ["effect rules (SYS-EFFECTS-01)"])],
    shared: [
      rule("SYS-EFFECTS-01", "verified", "r1039", ["effect rules (SYS-EFFECTS-01)"]),
      rule("SYS-EFFECTS-09", "verified", "r1039", ["effect rules (SYS-EFFECTS-09)"]),
    ],
  });
  assert.deepEqual(
    out.filter((failure) => failure.includes("SYS-EFFECTS-09")),
    ["SYS-EFFECTS-09 is declared in docs/rules-shared.md but no matrix row carries it"],
  );
});

test("a verified row whose test lacks its identifier fails", () => {
  const out = failures({
    rows: [row("washerwoman", "r2630", "verified", ["one of two"], "TB-WASHERWOMAN-01")],
    docs: [
      {
        role: "washerwoman",
        edition: "tb",
        rules: [rule("TB-WASHERWOMAN-01", "verified", "r2630", ["one of two"])],
      },
    ],
  });
  assert.equal(out.length, 1);
  assert.match(out[0], /cites "one of two", which carries no rule identifier/);
});

test("a valid shared row passes", () => {
  assert.deepEqual(
    failures({
      rows: [sharedRow("SYS-EFFECTS-01", "verified", ["effect rules (SYS-EFFECTS-01)"])],
      shared: [rule("SYS-EFFECTS-01", "verified", "r1039", ["effect rules (SYS-EFFECTS-01)"])],
    }),
    [],
  );
});

test("a shared row without a SYS identifier fails", () => {
  const out = failures({
    rows: [["Effect lifetime", "engine", `\`${SHARED_FILE}\` "effect rules"`, "verified"]],
    shared: [rule("SYS-EFFECTS-01", "verified", "r1039", ["effect rules"])],
  });
  assert.match(out.join("\n"), /carries 0 rule identifiers, expected exactly one/);
});

test("a shared row that keeps a role identifier fails", () => {
  const out = failures({
    rows: [sharedRow("TB-CHEF-01", "verified", ["effect rules (TB-CHEF-01)"])],
    shared: [rule("TB-CHEF-01", "verified", "r1039", ["effect rules (TB-CHEF-01)"])],
  });
  assert.match(out.join("\n"), /which is not a SYS- identifier/);
});

test("a verified shared rule whose document test lacks the identifier fails", () => {
  const out = failures({
    rows: [sharedRow("SYS-EFFECTS-01", "verified", ["effect rules (SYS-EFFECTS-01)"])],
    shared: [rule("SYS-EFFECTS-01", "verified", "r1039", ["effect rules"])],
  });
  assert.match(
    out.join("\n"),
    /SYS-EFFECTS-01 in docs\/rules-shared\.md is verified without a test that carries it/,
  );
});

test("a shared rule with a different level than its matrix row fails", () => {
  const out = failures({
    rows: [sharedRow("SYS-EFFECTS-01", "host-choice", [])],
    shared: [rule("SYS-EFFECTS-01", "verified", "r1039", ["effect rules (SYS-EFFECTS-01)"])],
  });
  assert.match(out.join("\n"), /SYS-EFFECTS-01 is host-choice in the matrix and verified/);
});
