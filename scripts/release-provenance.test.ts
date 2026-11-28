import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { provenanceFailures } from "./release-provenance.ts";

const NAME = "2026-01-01-sample";
const PATH = `openspec/changes/archive/${NAME}`;

function write(root: string, file: string, content: string): void {
  mkdirSync(join(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), content);
}

function fixture(): { root: string; target: { commit: string; date: string } } {
  const root = mkdtempSync(join(tmpdir(), "release-provenance-"));
  const git = (args: string[]): string =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "Test"]);
  write(root, "README.md", "# base\n");
  git(["add", "."]);
  git(["commit", "-qm", "base"]);
  write(root, `${PATH}/proposal.md`, "Issue: #1\n");
  git(["add", "."]);
  git(["commit", "-qm", "target adds the archive"]);
  const target = { commit: git(["rev-parse", "HEAD"]), date: git(["log", "-1", "--format=%cs"]) };
  write(
    root,
    "docs/audits/openspec-archive-index.json",
    JSON.stringify({
      schemaVersion: 2,
      canonicalization: "text-lf-binary-raw-v1",
      entries: [
        {
          name: NAME,
          commit: "d".repeat(40),
          date: "2026-01-01",
          path: PATH,
          treeHash: "a".repeat(64),
          issue: "#1",
          tests: ["src/sample.test.ts"],
        },
      ],
    }),
  );
  write(root, "fixtures/conformance/archive-origins.json", JSON.stringify({ origins: [] }));
  return { root, target };
}

function record(root: string, commit: string, date: string): void {
  write(
    root,
    "fixtures/conformance/archive-origins.json",
    JSON.stringify({ origins: [{ name: NAME, commit, date, reason: "reviewed dev origin" }] }),
  );
}

test("a target first add that equals the index needs no record", () => {
  const { root, target } = fixture();
  try {
    write(
      root,
      "docs/audits/openspec-archive-index.json",
      JSON.stringify({
        schemaVersion: 2,
        canonicalization: "text-lf-binary-raw-v1",
        entries: [
          {
            name: NAME,
            commit: target.commit,
            date: target.date,
            path: PATH,
            treeHash: "a".repeat(64),
            issue: "#1",
            tests: ["src/sample.test.ts"],
          },
        ],
      }),
    );
    assert.deepEqual(provenanceFailures(root, "main"), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a differing target first add needs the reviewed record", () => {
  const { root } = fixture();
  try {
    assert.ok(
      provenanceFailures(root, "main").some((failure) =>
        failure.includes("no reviewed origin for the target first add"),
      ),
    );
    record(root, "d".repeat(40), "2026-01-01");
    assert.deepEqual(provenanceFailures(root, "main"), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a record that differs from the index fails", () => {
  const { root } = fixture();
  try {
    record(root, "e".repeat(40), "2026-01-01");
    assert.ok(
      provenanceFailures(root, "main").some((failure) =>
        failure.includes("differs from the index"),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
