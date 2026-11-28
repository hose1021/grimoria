#!/usr/bin/env node
// Proves from the commit range that a pull request changes release metadata
// only. The title and file names never decide the exemption.
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

const RELEASE_FILES: Record<string, true> = {
  VERSION: true,
  "package.json": true,
  "package-lock.json": true,
  "CHANGELOG.md": true,
  "RELEASE_STATE.md": true,
};

const SEMVER = /^\d+\.\d+\.\d+$/;

export interface ReleaseMetadataResult {
  ok: boolean;
  version: string | null;
  pathsOnly: boolean;
  failures: string[];
}

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function at(root: string, ref: string, path: string): string | null {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], { cwd: root, encoding: "utf8" });
  } catch {
    return null;
  }
}

function parseJson(text: string | null): Record<string, unknown> | null {
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function withoutVersion(value: Record<string, unknown>): Record<string, unknown> {
  const copy = structuredClone(value);
  delete copy.version;
  return copy;
}

function withoutLockVersions(value: Record<string, unknown>): Record<string, unknown> {
  const copy = structuredClone(value);
  delete copy.version;
  const packages = copy.packages;
  if (typeof packages === "object" && packages !== null && !Array.isArray(packages)) {
    const entries = packages as Record<string, unknown>;
    const rootEntry = entries[""];
    if (typeof rootEntry === "object" && rootEntry !== null && !Array.isArray(rootEntry)) {
      const entry = { ...(rootEntry as Record<string, unknown>) };
      delete entry.version;
      entries[""] = entry;
    }
  }
  return copy;
}

export function releaseMetadataOnly(root: string, baseRef: string): ReleaseMetadataResult {
  const failures: string[] = [];
  let diff: string;
  try {
    diff = git(root, ["diff", "--name-status", "--no-renames", `${baseRef}...HEAD`]);
  } catch {
    return {
      ok: false,
      version: null,
      pathsOnly: false,
      failures: [`cannot read the diff against ${baseRef}`],
    };
  }
  const lines = diff.split("\n").filter(Boolean);
  if (lines.length === 0)
    return { ok: false, version: null, pathsOnly: false, failures: ["the diff is empty"] };

  const changed = new Set<string>();
  for (const line of lines) {
    const [status, path] = line.split("\t");
    if (!path) {
      failures.push(`unreadable diff line: ${line}`);
      continue;
    }
    if (status !== "M" && status !== "A") {
      failures.push(
        `${path}: release metadata cannot be ${status === "D" ? "deleted" : "renamed"}`,
      );
      continue;
    }
    if (!RELEASE_FILES[path]) {
      failures.push(`${path}: not release metadata`);
      continue;
    }
    changed.add(path);
  }
  if (failures.length) return { ok: false, version: null, pathsOnly: false, failures };

  const version = at(root, "HEAD", "VERSION")?.trim() ?? "";
  const previous = at(root, baseRef, "VERSION")?.trim() ?? "";
  if (!SEMVER.test(version)) failures.push("VERSION is not a semantic version");
  if (!SEMVER.test(previous)) failures.push("the base VERSION is not a semantic version");
  if (version === previous) failures.push("VERSION did not change");
  if (!changed.has("VERSION")) failures.push("VERSION is not changed");

  const manifestText = at(root, "HEAD", "package.json");
  const previousManifestText = at(root, baseRef, "package.json");
  const manifest = parseJson(manifestText);
  const previousManifest = parseJson(previousManifestText);
  if (!changed.has("package.json")) failures.push("package.json is not changed");
  if (!manifest || !previousManifest) failures.push("package.json is not a JSON object");
  else {
    if (manifest.version !== version) failures.push("package.json version differs from VERSION");
    if (!isDeepStrictEqual(withoutVersion(manifest), withoutVersion(previousManifest)))
      failures.push("package.json changes more than the version field");
  }

  if (changed.has("package-lock.json")) {
    const lock = parseJson(at(root, "HEAD", "package-lock.json"));
    const previousLock = parseJson(at(root, baseRef, "package-lock.json"));
    if (!lock || !previousLock) failures.push("package-lock.json is not a JSON object");
    else {
      if ("version" in lock && lock.version !== version)
        failures.push("package-lock.json version differs from VERSION");
      const packages = lock.packages;
      if (typeof packages === "object" && packages !== null && !Array.isArray(packages)) {
        const rootEntry = (packages as Record<string, unknown>)[""];
        if (
          typeof rootEntry === "object" &&
          rootEntry !== null &&
          !Array.isArray(rootEntry) &&
          "version" in rootEntry &&
          (rootEntry as Record<string, unknown>).version !== version
        )
          failures.push("package-lock.json root package version differs from VERSION");
      }
      if (!isDeepStrictEqual(withoutLockVersions(lock), withoutLockVersions(previousLock)))
        failures.push("package-lock.json changes more than its version fields");
    }
  }

  const changelog = at(root, "HEAD", "CHANGELOG.md") ?? "";
  if (!changed.has("CHANGELOG.md")) failures.push("CHANGELOG.md is not changed");
  if (
    !new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m").test(
      changelog,
    )
  )
    failures.push(`CHANGELOG.md has no dated ${version} heading`);
  if (!/^## \[Unreleased\]$/m.test(changelog))
    failures.push("CHANGELOG.md has no Unreleased heading");

  const releaseState = at(root, "HEAD", "RELEASE_STATE.md") ?? "";
  if (!changed.has("RELEASE_STATE.md")) failures.push("RELEASE_STATE.md is not changed");
  if (!releaseState.includes(version))
    failures.push("RELEASE_STATE.md does not name the new version");

  return { ok: failures.length === 0, version, pathsOnly: true, failures };
}

const isCli = process.argv[1] && process.argv[1].endsWith("release-metadata.ts");
if (isCli) {
  const [rootArg, baseRef] = process.argv.slice(2);
  if (!rootArg || !baseRef) {
    console.error("usage: release-metadata.ts <root> <base-ref>");
    process.exitCode = 2;
  } else {
    const result = releaseMetadataOnly(rootArg, baseRef);
    if (!result.ok) {
      for (const failure of result.failures) console.error(failure);
      process.exitCode = 1;
    } else {
      console.log(`Release metadata only: ${result.version as string}`);
    }
  }
}
