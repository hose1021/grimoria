import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { riskArtifactFailures } from "./check-risk-artifacts.ts";

function fixture(complete: boolean): string {
  const root = mkdtempSync(join(tmpdir(), "risk-artifacts-"));
  const dir = join(root, "openspec", "changes", "sample-change");
  mkdirSync(join(dir, "specs", "game"), { recursive: true });
  writeFileSync(join(dir, "proposal.md"), "Issue: #1\n");
  writeFileSync(join(dir, "design.md"), "Design.\n");
  if (complete) {
    writeFileSync(join(dir, "tasks.md"), "- [x] 1.1 Done.\n");
    writeFileSync(join(dir, "specs", "game", "spec.md"), "### Requirement: One\n");
  }
  return root;
}

test("an R3 change must name a complete OpenSpec package", () => {
  const complete = fixture(true);
  const incomplete = fixture(false);
  try {
    assert.deepEqual(
      riskArtifactFailures(
        "Issue: #1\nRisk: R3\nOpenSpec change: openspec/changes/sample-change\n",
        complete,
      ),
      [],
    );
    const failures = riskArtifactFailures(
      "Issue: #1\nRisk: R3\nOpenSpec change: changes/sample-change\n",
      incomplete,
    );
    assert.ok(failures.some((failure) => failure.includes("missing tasks.md")));
    assert.ok(failures.some((failure) => failure.includes("no delta spec")));
    assert.ok(
      riskArtifactFailures("Issue: #1\nRisk: R3\n", complete).some((failure) =>
        failure.includes("needs an `OpenSpec change:` line"),
      ),
    );
    assert.ok(
      riskArtifactFailures(
        "Issue: #1\nRisk: R3\nOpenSpec change: sample-change\n",
        join(complete, "nowhere"),
      ).some((failure) => failure.includes("no such OpenSpec change")),
    );
    assert.deepEqual(riskArtifactFailures("Issue: #1\nRisk: R2\n", complete), []);
    assert.ok(
      riskArtifactFailures("Issue: #1\n", complete).some((failure) => failure.includes("no Risk")),
    );
  } finally {
    rmSync(complete, { recursive: true, force: true });
    rmSync(incomplete, { recursive: true, force: true });
  }
});
