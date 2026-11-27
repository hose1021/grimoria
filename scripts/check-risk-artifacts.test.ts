import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { riskArtifactFailures } from "./check-risk-artifacts.ts";

function fixture(options: { specs: "none" | "workflow" | "game"; issue?: string }): string {
  const root = mkdtempSync(join(tmpdir(), "risk-artifacts-"));
  const dir = join(root, "openspec", "changes", "sample-change");
  mkdirSync(join(dir, "specs", "workflow"), { recursive: true });
  mkdirSync(join(dir, "specs", "game"), { recursive: true });
  writeFileSync(join(dir, "proposal.md"), `Issue: ${options.issue ?? "#1"}\n`);
  writeFileSync(join(dir, "design.md"), "Design.\n");
  writeFileSync(join(dir, "tasks.md"), "- [x] 1.1 Done.\n");
  if (options.specs === "workflow")
    writeFileSync(join(dir, "specs", "workflow", "spec.md"), "### Requirement: One\n");
  if (options.specs === "game")
    writeFileSync(join(dir, "specs", "game", "spec.md"), "### Requirement: One\n");
  return root;
}

const body = (extra = "") =>
  `Issue: #1\nRisk: R3\nOpenSpec change: openspec/changes/sample-change\n${extra}`;

test("an R3 change must name a same-issue OpenSpec package", () => {
  const complete = fixture({ specs: "game" });
  const unrelated = fixture({ specs: "game", issue: "#384" });
  const policy = fixture({ specs: "workflow" });
  const policyGameplay = fixture({ specs: "game" });
  const empty = fixture({ specs: "none" });
  try {
    assert.deepEqual(riskArtifactFailures(body(), complete), []);
    assert.ok(
      riskArtifactFailures(body(), unrelated).some((failure) =>
        failure.includes("proposal carries issue #384"),
      ),
      "a change for another issue must fail",
    );
    assert.deepEqual(
      riskArtifactFailures(body("Policy migration: true\n"), policy),
      [],
      "a policy migration may skip gameplay specs",
    );
    assert.ok(
      riskArtifactFailures(body(), empty).some((failure) => failure.includes("no delta spec")),
      "no specs must fail",
    );
    assert.ok(
      riskArtifactFailures(body("Policy migration: true\n"), policyGameplay).some((failure) =>
        failure.includes("workflow delta spec"),
      ),
      "a policy migration needs a workflow delta, not a gameplay one",
    );
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
    for (const root of [complete, unrelated, policy, empty])
      rmSync(root, { recursive: true, force: true });
  }
});
