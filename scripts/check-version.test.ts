import test from "node:test";
import assert from "node:assert/strict";

import { versionProblems } from "./check-version.ts";

const CHANGELOG = `# Changelog

## [Unreleased]

## [1.4.0] - 2026-11-16

### Added

- Add a thing

## [1.3.0] - 2026-11-01
`;

test("a matching version, manifest and newest release pass", () => {
  assert.deepEqual(
    versionProblems({ version: "1.4.0", manifestVersion: "1.4.0", changelog: CHANGELOG }),
    [],
  );
});

test("a manifest version that differs from VERSION fails", () => {
  const problems = versionProblems({
    version: "1.4.0",
    manifestVersion: "1.3.0",
    changelog: CHANGELOG,
  });
  assert.deepEqual(problems, ['package.json version "1.3.0" does not match VERSION "1.4.0"']);
});

test("a VERSION that is not semantic fails", () => {
  const problems = versionProblems({
    version: "v1.4.0",
    manifestVersion: "v1.4.0",
    changelog: CHANGELOG,
  });
  assert.deepEqual(problems, [
    'VERSION "v1.4.0" is not a semantic version',
    'CHANGELOG.md newest release "1.4.0" does not match VERSION "v1.4.0"',
  ]);
});

test("a changelog without an Unreleased section fails", () => {
  const problems = versionProblems({
    version: "1.4.0",
    manifestVersion: "1.4.0",
    changelog: CHANGELOG.replace("## [Unreleased]\n\n", ""),
  });
  assert.deepEqual(problems, ['CHANGELOG.md has no "## [Unreleased]" section']);
});

test("a changelog whose newest release differs from VERSION fails", () => {
  const problems = versionProblems({
    version: "1.4.0",
    manifestVersion: "1.4.0",
    changelog: CHANGELOG.replace("## [1.4.0] - 2026-11-16", "## [1.5.0] - 2026-11-16"),
  });
  assert.deepEqual(problems, [
    'CHANGELOG.md newest release "1.5.0" does not match VERSION "1.4.0"',
  ]);
});

test("a changelog without a released section fails", () => {
  const problems = versionProblems({
    version: "1.4.0",
    manifestVersion: "1.4.0",
    changelog: "# Changelog\n\n## [Unreleased]\n",
  });
  assert.deepEqual(problems, ["CHANGELOG.md has no released section"]);
});
