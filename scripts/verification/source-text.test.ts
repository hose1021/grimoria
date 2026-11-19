// The gate can only trust a declaration it can see execute. These tests pin the
// three scanners that decision rests on: comment stripping, skip detection and
// command reachability.
import test from "node:test";
import assert from "node:assert/strict";
import { commandReferences, stripComments, testDeclarations } from "./source-text.ts";

test("stripComments keeps string contents and removes both comment forms", () => {
  const source = [
    'const url = "http://example.test//path";',
    '// test("commented out", () => {});',
    'const marker = 1; /* block test("hidden", () => {}) */',
    "const template = `// still a string`;",
  ].join("\n");
  const stripped = stripComments(source);
  assert.ok(stripped.includes('"http://example.test//path"'));
  assert.ok(stripped.includes("`// still a string`"));
  assert.ok(stripped.includes("const marker = 1;"));
  assert.equal(stripped.includes("commented out"), false);
  assert.equal(stripped.includes("hidden"), false);
  assert.equal(stripped.split("\n").length, source.split("\n").length);
});

test("testDeclarations captures plain and only declarations as running", () => {
  const declarations = testDeclarations(`
    test("a plain test", () => {});
    test.only("a focused test", () => {});
    test.skip("a skipped test", () => {});
    test.todo("a todo test");
    test("an options skipped test", { skip: true }, () => {});
    test("an options todo test", { todo: true }, () => {});
    test(\`a template \${name} test\`, () => {});
  `);
  assert.deepEqual(
    declarations.map((entry) => [entry.name, entry.skipped]),
    [
      ["a plain test", false],
      ["a focused test", false],
      ["a skipped test", true],
      ["a todo test", true],
      ["an options skipped test", true],
      ["an options todo test", true],
    ],
  );
});

test("testDeclarations ignores a commented-out declaration", () => {
  const declarations = testDeclarations(`
    // test("removed evidence", () => {});
    /* test("removed evidence too", () => {}); */
    test("real evidence", () => {});
  `);
  assert.deepEqual(declarations, [{ name: "real evidence", skipped: false }]);
});

test("testDeclarations treats every test in a skipped suite as skipped", () => {
  const declarations = testDeclarations(`
    describe.skip("suite", () => {
      test("inner", () => {});
    });
  `);
  assert.deepEqual(declarations, [{ name: "inner", skipped: true }]);
});

test("testDeclarations ignores test source carried in a string literal", () => {
  const declarations = testDeclarations(`
    const fixture = \`test("a fixture that never runs", () => {});\`;
    const example = "test('another fixture', () => {})";
    test("real evidence", () => {});
  `);
  assert.deepEqual(declarations, [{ name: "real evidence", skipped: false }]);
});

test("testDeclarations treats an options-skipped suite and a body skip as skipped", () => {
  assert.deepEqual(
    testDeclarations(`
      describe("suite", { skip: true }, () => {
        test("inner", () => {});
      });
    `),
    [{ name: "inner", skipped: true }],
  );
  assert.deepEqual(
    testDeclarations(`
      test("body skip", (t) => { t.skip(); });
      test("neighbour", () => {});
    `),
    [
      { name: "body skip", skipped: true },
      { name: "neighbour", skipped: true },
    ],
  );
});

test("commandReferences counts dispatch sites but not comment mentions", () => {
  const live = `
    dispatch({ type: "startNight", payload: {} });
    actions.commands.completeNightStep(step);
  `;
  assert.equal(commandReferences(live, "startNight"), 1);
  assert.equal(commandReferences(live, "completeNightStep"), 1);
  assert.equal(
    commandReferences(`// type: "startNight"\n/* commands.startNight( */`, "startNight"),
    0,
  );
});
