#!/usr/bin/env node
// Rejects linters and formatters other than oxlint and oxfmt, and checks that
// the pull request workflow runs both gates.
//
// Limitation: this scan is textual. It reads package.json, the repository root
// entry list and the CI workflow. It cannot see a tool reached through a
// transitive package or configured in a nested directory.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CI_WORKFLOW = join(ROOT, ".github", "workflows", "ci.yml");

// The project uses one toolchain. A prefix match catches scoped variants such
// as @prettier/plugin-xml, eslint-plugin-* and @typescript-eslint/*.
const FORBIDDEN_PACKAGE =
  /^(?:eslint|prettier|tslint|stylelint|biome|markdownlint|@eslint\/|@prettier\/|@typescript-eslint\/|@biomejs\/)/;

// Configuration, cache and ignore files a removed tool leaves behind.
const FORBIDDEN_FILE =
  /^(?:\.prettierrc(?:\.[a-z]+)?|prettier\.config\.[a-z]+|\.prettierignore|\.eslintrc(?:\.[a-z]+)?|eslint\.config\.[a-z]+|\.eslintignore|\.eslintcache|biome\.jsonc?)$/;

// A script command that still runs one of those tools.
const FORBIDDEN_COMMAND = /\b(?:eslint|prettier|tslint|stylelint|biome|markdownlint)\b/;

const CI_COMMANDS = ["npm run lint", "npm run format:check"];

export function checkForbiddenPackages({ dependencies = {}, devDependencies = {} } = {}) {
  const problems = [];
  for (const [field, block] of [
    ["dependencies", dependencies],
    ["devDependencies", devDependencies]
  ]) {
    for (const name of Object.keys(block)) {
      if (FORBIDDEN_PACKAGE.test(name)) problems.push(`${field} declares "${name}"`);
    }
  }
  return problems;
}

export function checkForbiddenFiles(entries = []) {
  return entries
    .filter((name) => FORBIDDEN_FILE.test(name))
    .map((name) => `repository root contains "${name}"`);
}

export function checkForbiddenCommands(scripts = {}) {
  const problems = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (FORBIDDEN_COMMAND.test(String(command))) problems.push(`scripts.${name} runs "${command}"`);
  }
  return problems;
}

export function checkCiWorkflow(text = "") {
  return CI_COMMANDS.filter((command) => !text.includes(command)).map(
    (command) => `.github/workflows/ci.yml does not run "${command}"`
  );
}

export function checkToolchain(input = {}) {
  return [
    ...checkForbiddenPackages(input),
    ...checkForbiddenFiles(input.entries),
    ...checkForbiddenCommands(input.scripts),
    ...checkCiWorkflow(input.ciWorkflow)
  ];
}

function main() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const problems = checkToolchain({
    ...pkg,
    entries: readdirSync(ROOT),
    ciWorkflow: readFileSync(CI_WORKFLOW, "utf8")
  });
  if (problems.length) {
    console.error(`Toolchain check failed with ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log("Toolchain check passed: oxlint and oxfmt are the only lint and format tools.");
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) main();
