#!/usr/bin/env node
// Branch name and pull request title check for GitFlow.
// Reads HEAD_REF and PR_TITLE from the environment; no repository access.
// `hotfix` is a branch prefix only; its pull request title uses `fix`, and the
// title ends with the GitHub issue reference `(#N)`, matching AGENTS.md.
const BRANCH_PREFIXES = [
  "feat",
  "fix",
  "docs",
  "refactor",
  "test",
  "chore",
  "ci",
  "perf",
  "hotfix",
];
const COMMIT_TYPES = [
  "feat",
  "fix",
  "docs",
  "refactor",
  "test",
  "chore",
  "ci",
  "perf",
  "build",
  "style",
  "revert",
];
// The integration branch is also a pull-request head for a release into main.
const INTEGRATION_BRANCHES: Readonly<Record<string, true>> = { dev: true };
const BRANCH = new RegExp(`^(?:${BRANCH_PREFIXES.join("|")})/[a-z0-9]+(?:-[a-z0-9]+)*$`);
// Release branches are the only long-lived branches besides `dev` (AGENTS.md).
const RELEASE_BRANCH = /^release-\d+\.\d+\.\d+$/;
const TITLE = new RegExp(
  `^(?:${COMMIT_TYPES.join("|")})(?:\\([a-z0-9-]+\\))?!?: [a-z].*[^.] \\(#\\d+\\)$`,
);

const branch = (process.env.HEAD_REF || "").trim();
const title = (process.env.PR_TITLE || "").trim();

if (!branch && !title) {
  console.log("Git conventions check skipped: no pull request context.");
  process.exit(0);
}

const problems = [];
if (!BRANCH.test(branch) && !RELEASE_BRANCH.test(branch) && !INTEGRATION_BRANCHES[branch]) {
  problems.push(
    `branch "${branch}" must match <type>/<lowercase-kebab-case>, release-<x.y.z>, or be the dev integration branch; allowed types: ${BRANCH_PREFIXES.join(", ")}`,
  );
}
if (!TITLE.test(title)) {
  problems.push(
    `pull request title "${title}" must match "<type>(scope)?: lowercase imperative subject (#N)"; include the GitHub issue reference, keep no trailing period and use one of: ${COMMIT_TYPES.join(", ")}`,
  );
}

if (problems.length) {
  console.error(`Git conventions check failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Git conventions check passed: ${branch} / ${title}`);
