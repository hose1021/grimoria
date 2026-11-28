import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { releaseMetadataOnly } from "./release-metadata.ts";

const BASE_VERSION = "0.1.0";
const NEXT_VERSION = "0.2.0";

function write(root: string, path: string, content: string): void {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), content);
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function manifest(version: string, options: { dependency?: string; script?: string } = {}): string {
  return json({
    name: "sample",
    version,
    private: true,
    scripts: { test: options.script ?? "node --test" },
    dependencies: { alpha: options.dependency ?? "1.0.0" },
  });
}

function lock(version: string, options: { dependency?: string } = {}): string {
  return json({
    name: "sample",
    version,
    lockfileVersion: 3,
    packages: {
      "": { name: "sample", version, dependencies: { alpha: options.dependency ?? "1.0.0" } },
      "node_modules/alpha": { version: options.dependency ?? "1.0.0" },
    },
  });
}

function repository(): { root: string; base: string } {
  const root = mkdtempSync(join(tmpdir(), "release-metadata-"));
  const git = (args: string[]): string =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git(["init", "-q", "-b", "dev"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "Test"]);
  write(root, "VERSION", `${BASE_VERSION}\n`);
  write(root, "package.json", manifest(BASE_VERSION));
  write(root, "package-lock.json", lock(BASE_VERSION));
  write(
    root,
    "CHANGELOG.md",
    `# Changelog\n\n## [Unreleased]\n\n## [${BASE_VERSION}] - 2026-01-01\n\n- One.\n`,
  );
  write(root, "RELEASE_STATE.md", `# Release state\n\nCandidate ${BASE_VERSION}.\n`);
  write(root, "src/app.ts", "export const app = true;\n");
  git(["add", "."]);
  git(["commit", "-qm", "base"]);
  return { root, base: git(["rev-parse", "HEAD"]) };
}

function bump(root: string, options: { lock?: boolean } = {}): void {
  write(root, "VERSION", `${NEXT_VERSION}\n`);
  write(root, "package.json", manifest(NEXT_VERSION));
  if (options.lock !== false) write(root, "package-lock.json", lock(NEXT_VERSION));
  write(
    root,
    "CHANGELOG.md",
    `# Changelog\n\n## [Unreleased]\n\n## [${NEXT_VERSION}] - 2026-02-01\n\n- Two.\n\n## [${BASE_VERSION}] - 2026-01-01\n\n- One.\n`,
  );
  write(root, "RELEASE_STATE.md", `# Release state\n\nCandidate ${NEXT_VERSION}.\n`);
}

function commit(root: string): void {
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-qm", "bump"], { cwd: root });
}

test("a version bump that touches release metadata only passes", () => {
  const { root, base } = repository();
  try {
    bump(root);
    commit(root);
    const result = releaseMetadataOnly(root, base);
    assert.deepEqual(result.failures, []);
    assert.equal(result.ok, true);
    assert.equal(result.version, NEXT_VERSION);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a release without the lock version change passes", () => {
  const { root, base } = repository();
  try {
    bump(root, { lock: false });
    commit(root);
    assert.equal(releaseMetadataOnly(root, base).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a dependency, script or lock dependency change fails the exemption", () => {
  const cases: Array<(root: string) => void> = [
    (root) => {
      bump(root);
      write(root, "package.json", manifest(NEXT_VERSION, { dependency: "2.0.0" }));
    },
    (root) => {
      bump(root);
      write(root, "package.json", manifest(NEXT_VERSION, { script: "vitest" }));
    },
    (root) => {
      bump(root);
      write(root, "package-lock.json", lock(NEXT_VERSION, { dependency: "2.0.0" }));
    },
  ];
  for (const change of cases) {
    const { root, base } = repository();
    try {
      change(root);
      commit(root);
      const result = releaseMetadataOnly(root, base);
      assert.equal(result.ok, false);
      assert.ok(result.failures.some((failure) => failure.includes("more than")));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("a runtime, workflow or verification change is not release metadata", () => {
  const cases = [
    "src/app.ts",
    ".github/workflows/ci.yml",
    "scripts/check-risk-tier.ts",
    "openspec/specs/workflow/verification-gates/spec.md",
  ];
  for (const path of cases) {
    const { root, base } = repository();
    try {
      bump(root);
      write(root, path, "changed\n");
      commit(root);
      const result = releaseMetadataOnly(root, base);
      assert.equal(result.ok, false);
      assert.equal(result.pathsOnly, false);
      assert.ok(result.failures.some((failure) => failure.includes("not release metadata")));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("an empty commit range is not release metadata", () => {
  const { root, base } = repository();
  try {
    const result = releaseMetadataOnly(root, base);
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((failure) => failure.includes("the diff is empty")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an incomplete or inconsistent bump fails", () => {
  const cases: Array<{ change: (root: string) => void; failure: string }> = [
    {
      change: (root) => {
        bump(root);
        write(root, "package.json", manifest(BASE_VERSION));
      },
      failure: "package.json version differs from VERSION",
    },
    {
      change: (root) => {
        bump(root);
        write(
          root,
          "CHANGELOG.md",
          `# Changelog\n\n## [Unreleased]\n\n## [${BASE_VERSION}] - 2026-01-01\n`,
        );
      },
      failure: "has no dated",
    },
    {
      change: (root) => {
        bump(root);
        write(root, "RELEASE_STATE.md", "# Release state\n");
      },
      failure: "does not name the new version",
    },
  ];
  for (const { change, failure } of cases) {
    const { root, base } = repository();
    try {
      change(root);
      commit(root);
      const result = releaseMetadataOnly(root, base);
      assert.equal(result.ok, false);
      assert.ok(
        result.failures.some((line) => line.includes(failure)),
        `${failure}: ${result.failures.join("; ")}`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
