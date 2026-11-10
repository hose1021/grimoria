#!/usr/bin/env node
// Branch name and pull request title check for GitHub Flow.
// Reads HEAD_REF and PR_TITLE from the environment; no repository access.
// Branch prefixes are a subset of the commit types: build, style and revert are
// commit types only, matching AGENTS.md.
const BRANCH_PREFIXES = ["feat", "fix", "docs", "refactor", "test", "chore", "ci", "perf"];
const COMMIT_TYPES = [...BRANCH_PREFIXES, "build", "style", "revert"];
const BRANCH = new RegExp(`^(?:${BRANCH_PREFIXES.join("|")})/[a-z0-9]+(?:-[a-z0-9]+)*$`);
const TITLE = new RegExp(`^(?:${COMMIT_TYPES.join("|")})(?:\\([a-z0-9-]+\\))?!?: [a-z].*[^.]$`);

const branch = (process.env.HEAD_REF || "").trim();
const title = (process.env.PR_TITLE || "").trim();

if (!branch && !title) {
  console.log("Git conventions check skipped: no pull request context.");
  process.exit(0);
}

const problems = [];
if (!BRANCH.test(branch)) {
  problems.push(`branch "${branch}" must match <type>/<lowercase-kebab-case>; allowed types: ${BRANCH_PREFIXES.join(", ")}`);
}
if (!TITLE.test(title)) {
  problems.push(`pull request title "${title}" must match "<type>(scope)?: lowercase imperative subject" with no trailing period; allowed types: ${COMMIT_TYPES.join(", ")}`);
}

if (problems.length) {
  console.error(`Git conventions check failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Git conventions check passed: ${branch} / ${title}`);
