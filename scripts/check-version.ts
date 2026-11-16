#!/usr/bin/env node
// One release identity: VERSION, package.json and the newest changelog section
// must agree. A mismatch is reported, never repaired.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const RELEASE = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/gm;

export interface VersionSources {
  version: string;
  manifestVersion: string;
  changelog: string;
}

export function versionProblems({ version, manifestVersion, changelog }: VersionSources): string[] {
  const problems: string[] = [];
  if (!SEMVER.test(version)) problems.push(`VERSION "${version}" is not a semantic version`);
  if (manifestVersion !== version) {
    problems.push(`package.json version "${manifestVersion}" does not match VERSION "${version}"`);
  }
  if (!/^## \[Unreleased\]$/m.test(changelog)) {
    problems.push('CHANGELOG.md has no "## [Unreleased]" section');
  }
  const releases = [...changelog.matchAll(RELEASE)];
  const newest = releases[0]?.[1];
  if (newest === undefined) {
    problems.push("CHANGELOG.md has no released section");
  } else if (newest !== version) {
    problems.push(`CHANGELOG.md newest release "${newest}" does not match VERSION "${version}"`);
  }
  return problems;
}

function main(): void {
  const version = readFileSync(join(ROOT, "VERSION"), "utf8").trim();
  const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    version?: string;
  };
  const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
  const problems = versionProblems({
    version,
    manifestVersion: manifest.version ?? "",
    changelog,
  });
  if (problems.length) {
    console.error(`Version check failed with ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Version check passed: ${version}`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) main();
