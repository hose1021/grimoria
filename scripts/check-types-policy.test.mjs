import test from "node:test";
import assert from "node:assert/strict";
import {
  checkAssertions,
  checkFile,
  checkImports,
  checkNoBrowserGlobals,
  checkSource,
  checkEntry,
  checkStylesheets,
  checkStylesTree,
  checkTheme,
  countAnyTokens,
  extractSpecifiers,
} from "./check-types-policy.mjs";

test("type policy accepts a documented suppression", () => {
  const text = "// @ts-expect-error -- legacy boundary\nconst value = 1;";
  assert.deepEqual(checkSource(text), []);
});

test("type policy rejects @ts-ignore", () => {
  const violations = checkSource("// @ts-ignore\nconst value = 1;");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /@ts-ignore is forbidden/);
});

test("type policy rejects @ts-nocheck", () => {
  const violations = checkSource("// @ts-nocheck");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /@ts-nocheck is forbidden/);
});

test("type policy rejects an unexplained @ts-expect-error", () => {
  const violations = checkSource("// @ts-expect-error\nconst value = 1;");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /needs a reason/);
});

test("the two boundary files may assert the validated state type", () => {
  assert.deepEqual(
    checkAssertions("const state = value as ValidatedState;", "src/core/model/validated.ts"),
    [],
  );
  assert.deepEqual(
    checkAssertions("const state = value as ValidatedState;", "src/application/dispatch/adopt.ts"),
    [],
  );
});

test("an assertion outside the boundary is reported", () => {
  const violations = checkAssertions(
    "const state = value as ValidatedState;",
    "src/core/commands/prepare.ts",
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0], /as ValidatedState/);
});

test("a double assertion outside the boundary is reported", () => {
  const violations = checkAssertions(
    "const state = value as unknown as Thing;",
    "src/core/commands/prepare.ts",
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0], /as unknown as/);
});

test("the any metric counts JSDoc types and ignores prose", () => {
  assert.equal(countAnyTokens("/** @type {any} */ const value = 1;", true), 1);
  assert.equal(
    countAnyTokens("// the word any in a comment\nconst text: string = 'any';", false),
    0,
  );
});

test("core cannot import infrastructure", () => {
  const violations = checkImports('import { x } from "../infrastructure/x.ts";', "src/core/a.ts");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /core must not import infrastructure/);
});

test("application cannot import ui", () => {
  const violations = checkImports('import { x } from "../ui/x.ts";', "src/application/a.ts");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /application must not import ui/);
});

test("ui cannot import infrastructure", () => {
  const violations = checkImports('import { x } from "../infrastructure/x.ts";', "src/ui/a.ts");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /ui must not import infrastructure/);
});

test("node built-ins are confined to scripts and tests", () => {
  assert.deepEqual(checkImports('import test from "node:test";', "src/core/a.test.ts"), []);
  assert.deepEqual(checkImports('import fs from "node:fs";', "scripts/a.mjs"), []);
  const violations = checkImports('import fs from "node:fs";', "src/core/a.ts");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /node:fs/);
});

test("production code may not import a test file", () => {
  const violations = checkImports('import { x } from "./a.test.ts";', "src/core/a.ts");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /imports test file/);
});

test("a core test may not import infrastructure", () => {
  const violations = checkImports(
    'import { x } from "../infrastructure/x.ts";',
    "src/core/a.test.ts",
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0], /core test must not import infrastructure/);
});

test("a non-literal dynamic import is rejected in the pure layers", () => {
  const violations = checkImports("const name = './x.ts'; import(name);", "src/application/a.ts");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /non-literal/);
});

test("a literal dynamic import is accepted", () => {
  assert.deepEqual(checkImports('import("./x.ts");', "src/application/a.ts"), []);
});

test("an alias is rejected", () => {
  const violations = checkImports('import { x } from "@/x.ts";', "src/ui/a.ts");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /alias/);
});

test("a bare specifier is rejected in the pure layers", () => {
  const violations = checkImports('import { x } from "react";', "src/core/a.ts");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /bare specifier/);
  assert.deepEqual(checkImports('import { x } from "react";', "src/ui/a.ts"), []);
});

test("a type-only legacy import is rejected in core", () => {
  const violations = checkImports(
    'import type { GameState } from "../../js/types.js";',
    "src/core/a.ts",
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0], /legacy tree/);
});

test("a value import from the legacy tree is rejected in core", () => {
  const violations = checkImports(
    'import { createGame } from "../../js/model.js";',
    "src/core/a.ts",
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0], /legacy tree/);
});

test("a legacy import is rejected in the composition root", () => {
  const violations = checkImports(
    'import { state } from "../../js/store.js";',
    "src/entry/main.ts",
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0], /legacy tree is retired/);
});

test("a legacy import is rejected in a test file", () => {
  const violations = checkImports(
    'import { createGame } from "../../js/model.js";',
    "src/entry/store.test.ts",
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0], /legacy tree is retired/);
});

test("a quoted word import is not a side-effect import", () => {
  assert.deepEqual(extractSpecifiers('test("export and import", () => {});'), []);
});

test("every static specifier form is extracted", () => {
  const source = [
    'import { a } from "./a.ts";',
    'import type { B } from "./b.ts";',
    'import "./side.ts";',
    'export { c } from "./c.ts";',
    'export * from "./d.ts";',
    'import("./e.ts");',
  ].join("\n");
  const specifiers = extractSpecifiers(source).map((entry) => entry.specifier);
  assert.deepEqual(
    specifiers.sort(),
    ["./a.ts", "./b.ts", "./c.ts", "./d.ts", "./e.ts", "./side.ts"].sort(),
  );
});

test("browser globals are rejected in the pure layers", () => {
  const violations = checkNoBrowserGlobals(
    "const x = localStorage.getItem('a');",
    "src/application/a.ts",
  );
  assert.equal(violations.length, 1);
  assert.deepEqual(
    checkNoBrowserGlobals(
      "// localStorage is mentioned here\nconst x = 1;",
      "src/application/a.ts",
    ),
    [],
  );
});

test("a src file with an any token is rejected", () => {
  const violations = checkFile("const value: any = 1;", "src/core/a.ts");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /any/);
});

test("a clean src file passes", () => {
  assert.deepEqual(checkFile("export const value: string = 'x';", "src/core/a.ts"), []);
});

// Token fixtures: the shell token mirrors the source token, so a fixture pair
// agrees unless the test breaks one side on purpose.
const ENTRY_CSS =
  "@layer theme, base, components, utilities;\n" +
  '@import "tailwindcss/theme.css" layer(theme);\n' +
  '@import "tailwindcss/utilities.css" layer(utilities) source(none);\n' +
  "@theme {\n--color-panel: #121619;\n--radius: 10px;\n}\n";

test("the repository keeps one stylesheet", async () => {
  assert.deepEqual(await checkStylesTree(), []);
});

test("a single layered entry passes", () => {
  assert.deepEqual(checkStylesheets(["css/app.css"]), []);
  assert.deepEqual(checkEntry(ENTRY_CSS), []);
});

test("a second stylesheet is reported with both names", () => {
  const violations = checkStylesheets(["css/app.css", "css/bag.css"]);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /css\/app\.css/);
  assert.match(violations[0], /css\/bag\.css/);
});

test("an entry without the tailwind layers is reported", () => {
  const violations = checkEntry("@theme { --color-panel: #121619; }");
  assert.ok(violations.some((line) => /tailwind theme/i.test(line)));
  assert.ok(violations.some((line) => /tailwind utilities/i.test(line)));
});

test("a :root declaration beside the theme is reported", () => {
  const violations = checkEntry(ENTRY_CSS + ":root {\n--panel: #121619;\n}\n");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /:root/);
});

test("a theme token nothing uses is reported", () => {
  const violations = checkTheme({ css: ENTRY_CSS, usage: [] });
  assert.ok(violations.some((line) => /--color-panel/.test(line)));
  assert.ok(violations.some((line) => /--radius/.test(line)));
});

test("used tokens pass", () => {
  const violations = checkTheme({
    css: ENTRY_CSS,
    usage: [{ file: "src/ui/a.tsx", text: '<div className="bg-panel rounded-[var(--radius)]" />' }],
  });
  assert.deepEqual(violations, []);
});

test("a reference to an undeclared token names the file", () => {
  const violations = checkTheme({
    css: ENTRY_CSS,
    usage: [
      { file: "src/ui/a.tsx", text: '<div className="bg-panel rounded-[var(--radius)]" />' },
      { file: "src/ui/b.tsx", text: '<div className="bg-[var(--color-nope)]" />' },
    ],
  }).filter((line) => /--color-nope/.test(line));
  assert.equal(violations.length, 1);
  assert.match(violations[0], /src\/ui\/b\.tsx/);
});

test("a locally declared custom property is a valid reference", () => {
  const violations = checkTheme({
    css: ENTRY_CSS,
    usage: [
      { file: "src/ui/a.tsx", text: '<div className="bg-panel rounded-[var(--radius)]" />' },
      {
        file: "src/ui/probe.tsx",
        text: 'const style = { "--x": "10%" }; const cls = "left-[var(--x)]";',
      },
    ],
  }).filter((line) => /--x\b/.test(line));
  assert.deepEqual(violations, []);
});
