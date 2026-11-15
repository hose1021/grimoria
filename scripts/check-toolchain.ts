#!/usr/bin/env node
// Rejects linters and formatters other than oxlint and oxfmt, and checks that
// the pull request workflow runs both gates. It also keeps first-party scripts
// TypeScript.
//
// Limitation: this scan is textual. It reads package.json, the repository root
// entry list, the scripts/ file list and the CI workflow. It cannot see a tool
// reached through a transitive package or configured in a nested directory.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CI_WORKFLOW = join(ROOT, ".github", "workflows", "ci.yml");
const SCRIPTS = join(ROOT, "scripts");

// The project uses one toolchain. A prefix match catches scoped variants such
// as @prettier/plugin-xml, eslint-plugin-* and @typescript-eslint/*.
const FORBIDDEN_PACKAGE =
  /^(?:eslint|prettier|tslint|stylelint|biome|markdownlint|@eslint\/|@prettier\/|@typescript-eslint\/|@biomejs\/)/;

// Configuration, cache and ignore files a removed tool leaves behind.
const FORBIDDEN_FILE =
  /^(?:\.prettierrc(?:\.[a-z]+)?|prettier\.config\.[a-z]+|\.prettierignore|\.eslintrc(?:\.[a-z]+)?|eslint\.config\.[a-z]+|\.eslintignore|\.eslintcache|biome\.jsonc?)$/;

// A script command that still runs one of those tools.
const FORBIDDEN_COMMAND = /\b(?:eslint|prettier|tslint|stylelint|biome|markdownlint)\b/;

// First-party executable source is TypeScript. The scan reads only scripts/,
// so installed packages (node_modules), built artifacts (dist) and committed
// locale data (public/assets/data/*.js) are outside it by construction.
const FORBIDDEN_SCRIPT_EXTENSION = /\.(?:c|m)?jsx?$/;

const CI_COMMANDS = ["npm run lint", "npm run format:check"];

interface ToolchainInput {
  ciWorkflow?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  entries?: string[];
  scriptFiles?: string[];
  scripts?: Record<string, string>;
}

export function checkForbiddenPackages({
  dependencies = {},
  devDependencies = {},
}: Pick<ToolchainInput, "dependencies" | "devDependencies"> = {}): string[] {
  const problems: string[] = [];
  for (const [field, block] of [
    ["dependencies", dependencies],
    ["devDependencies", devDependencies],
  ] as const) {
    for (const name of Object.keys(block)) {
      if (FORBIDDEN_PACKAGE.test(name)) problems.push(`${field} declares "${name}"`);
    }
  }
  return problems;
}

export function checkForbiddenFiles(entries: string[] = []): string[] {
  return entries
    .filter((name) => FORBIDDEN_FILE.test(name))
    .map((name) => `repository root contains "${name}"`);
}

export function checkForbiddenCommands(scripts: Record<string, string> = {}): string[] {
  const problems: string[] = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (FORBIDDEN_COMMAND.test(String(command))) problems.push(`scripts.${name} runs "${command}"`);
  }
  return problems;
}

/** First-party files under scripts/ must be TypeScript. */
export function checkScriptExtensions(files: string[] = []): string[] {
  return files
    .filter((name) => FORBIDDEN_SCRIPT_EXTENSION.test(name))
    .map(
      (name) =>
        `scripts/${name}: first-party scripts must be TypeScript; rename it to .ts and type it`,
    );
}

export function checkCiWorkflow(text = ""): string[] {
  return CI_COMMANDS.filter((command) => !text.includes(command)).map(
    (command) => `.github/workflows/ci.yml does not run "${command}"`,
  );
}

export function checkToolchain(input: ToolchainInput = {}): string[] {
  return [
    ...checkForbiddenPackages(input),
    ...checkForbiddenFiles(input.entries),
    ...checkForbiddenCommands(input.scripts),
    ...checkScriptExtensions(input.scriptFiles),
    ...checkCiWorkflow(input.ciWorkflow),
  ];
}

/** Repository-relative names of every file under a directory, recursively. */
function filesUnder(directory: string, prefix = ""): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...filesUnder(join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

function main() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const problems = checkToolchain({
    ...pkg,
    entries: readdirSync(ROOT),
    scriptFiles: filesUnder(SCRIPTS),
    ciWorkflow: readFileSync(CI_WORKFLOW, "utf8"),
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
