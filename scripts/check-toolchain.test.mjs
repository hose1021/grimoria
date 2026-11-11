import test from "node:test";
import assert from "node:assert/strict";
import {
  checkCiWorkflow,
  checkForbiddenCommands,
  checkForbiddenFiles,
  checkForbiddenPackages,
  checkToolchain
} from "./check-toolchain.mjs";

const CI_WORKFLOW = "- run: npm run lint\n- run: npm run format:check\n";

const CLEAN = {
  dependencies: {},
  devDependencies: { oxfmt: "0.78.0", oxlint: "1.93.0" },
  scripts: {
    lint: "oxlint js src scripts vite.config.ts",
    format: "oxfmt js src scripts vite.config.ts package.json",
    "format:check": "oxfmt --check js src scripts vite.config.ts package.json"
  },
  entries: [".gitattributes", ".oxfmtrc.json", ".oxlintrc.json", "package.json"],
  ciWorkflow: CI_WORKFLOW
};

test("the toolchain check accepts the oxlint and oxfmt tree", () => {
  assert.deepEqual(checkToolchain(CLEAN), []);
});

test("a formatter in dependencies is reported", () => {
  const problems = checkToolchain({ ...CLEAN, dependencies: { prettier: "3.6.2" } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /dependencies declares "prettier"/);
});

test("a linter in devDependencies is reported", () => {
  const problems = checkToolchain({
    ...CLEAN,
    devDependencies: { ...CLEAN.devDependencies, eslint: "9.39.1" }
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /devDependencies declares "eslint"/);
});

test("a scoped formatter plugin is reported", () => {
  const problems = checkForbiddenPackages({ devDependencies: { "@prettier/plugin-xml": "3.4.2" } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /@prettier\/plugin-xml/);
});

test("a format script that still calls prettier is reported", () => {
  const problems = checkForbiddenCommands({ format: "prettier --write ." });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /scripts\.format runs/);
});

test("a lint script that still calls eslint is reported", () => {
  const problems = checkForbiddenCommands({ lint: "npx eslint js src" });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /scripts\.lint runs/);
});

for (const name of [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierignore",
  ".eslintrc",
  ".eslintrc.cjs",
  "eslint.config.js",
  ".eslintignore"
]) {
  test(`the toolchain check rejects ${name}`, () => {
    const problems = checkForbiddenFiles([...CLEAN.entries, name]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /repository root contains/);
  });
}

test("the toolchain check keeps the Oxc config files", () => {
  assert.deepEqual(checkForbiddenFiles([".oxlintrc.json", ".oxfmtrc.json", ".gitattributes"]), []);
});

test("a workflow without the pull request gates is reported", () => {
  const problems = checkCiWorkflow("name: CI\njobs: {}\n");
  assert.equal(problems.length, 2);
  assert.match(problems[0], /does not run "npm run lint"/);
  assert.match(problems[1], /does not run "npm run format:check"/);
});

test("a workflow with both gates is accepted", () => {
  assert.deepEqual(checkCiWorkflow(CI_WORKFLOW), []);
});
