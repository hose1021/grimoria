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
    const touched = [
      "openspec/changes/sample-change/proposal.md",
      "openspec/changes/sample-change/specs/game/spec.md",
    ];
    assert.deepEqual(riskArtifactFailures(body(), complete, { changedFiles: touched }), []);
    assert.ok(
      riskArtifactFailures(body(), complete).some((failure) =>
        failure.includes("does not touch this change"),
      ),
      "an active package must be touched by the pull request",
    );
    assert.ok(
      riskArtifactFailures(body(), complete, {
        changedFiles: ["openspec/changes/sample-change/tasks.md"],
      }).some((failure) => failure.includes("trivial edit does not satisfy R3")),
      "a trivial edit to an unrelated change must not satisfy R3",
    );
    assert.ok(
      riskArtifactFailures(body(), unrelated, { changedFiles: touched }).some((failure) =>
        failure.includes("proposal carries issue #384"),
      ),
      "a change for another issue must fail",
    );
    assert.deepEqual(
      riskArtifactFailures(body("Policy migration: true\n"), policy, { changedFiles: touched }),
      [],
      "a policy migration may skip gameplay specs",
    );
    assert.ok(
      riskArtifactFailures(body(), empty, { changedFiles: touched }).some((failure) =>
        failure.includes("no delta spec"),
      ),
      "no specs must fail",
    );
    assert.ok(
      riskArtifactFailures(body("Policy migration: true\n"), policyGameplay, {
        changedFiles: touched,
      }).some((failure) => failure.includes("workflow delta spec")),
      "a policy migration needs a workflow delta, not a gameplay one",
    );
    assert.ok(
      riskArtifactFailures("Issue: #1\nRisk: R3\n", complete).some((failure) =>
        failure.includes("needs an `OpenSpec change:` line"),
      ),
    );
    assert.ok(
      riskArtifactFailures(body("Policy migration: true\n"), policy, {
        changedFiles: [...touched, "src/core/engine/commands.ts"],
      }).some((failure) => failure.includes("game/command-engine delta spec")),
      "a workflow delta cannot substitute a runtime behaviour spec",
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

function archiveFixture(options: { index: boolean; baseline: boolean }): string {
  const root = mkdtempSync(join(tmpdir(), "risk-archive-"));
  const name = "2026-01-01-sample-change";
  const dir = join(root, "openspec", "changes", "archive", name);
  mkdirSync(join(dir, "specs", "workflow"), { recursive: true });
  writeFileSync(join(dir, "proposal.md"), "Issue: #1\n");
  writeFileSync(join(dir, "design.md"), "Design.\n");
  writeFileSync(join(dir, "tasks.md"), "- [x] 1.1 Done.\n");
  writeFileSync(join(dir, "specs", "workflow", "spec.md"), "### Requirement: One\n");
  mkdirSync(join(root, "docs", "audits"), { recursive: true });
  writeFileSync(
    join(root, "docs", "audits", "openspec-archive-index.json"),
    JSON.stringify({
      entries: options.index ? [{ name, path: `openspec/changes/archive/${name}` }] : [],
    }),
  );
  writeFileSync(
    join(root, "docs", "audits", "openspec-archive-baseline.json"),
    JSON.stringify({ entries: options.baseline ? [{ name }] : [] }),
  );
  return root;
}

const archiveChanged = [
  "openspec/changes/archive/2026-01-01-sample-change/proposal.md",
  "openspec/changes/archive/2026-01-01-sample-change/design.md",
  "openspec/changes/sample-change/proposal.md",
  "openspec/specs/workflow/verification-gates/spec.md",
  "docs/audits/openspec-archive-index.json",
];
test("an archive-only transition keeps the package and its evidence", () => {
  const roots = [
    archiveFixture({ index: true, baseline: true }),
    archiveFixture({ index: false, baseline: true }),
    archiveFixture({ index: true, baseline: false }),
  ];
  const [complete, noIndex, noBaseline] = roots;
  try {
    assert.deepEqual(
      riskArtifactFailures(
        "Issue: #1\nRisk: R3\nOpenSpec change: openspec/changes/archive/2026-01-01-sample-change\n",
        complete,
        { changedFiles: archiveChanged },
      ),
      [],
    );
    assert.deepEqual(
      riskArtifactFailures("Issue: #1\nRisk: R3\nOpenSpec change: sample-change\n", complete, {
        changedFiles: archiveChanged,
      }),
      [],
      "the archived package resolves by its base name after the active directory is removed",
    );
    assert.ok(
      riskArtifactFailures("Issue: #1\nRisk: R3\nOpenSpec change: sample-change\n", noIndex, {
        changedFiles: archiveChanged,
      }).some((failure) => failure.includes("archive index has no entry")),
    );
    assert.ok(
      riskArtifactFailures("Issue: #1\nRisk: R3\nOpenSpec change: sample-change\n", noBaseline, {
        changedFiles: archiveChanged,
      }).some((failure) => failure.includes("archive baseline does not pin it")),
    );
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
});

test("an archived package cannot satisfy a behavior change", () => {
  const root = archiveFixture({ index: true, baseline: true });
  try {
    const body = "Issue: #1\nRisk: R3\nOpenSpec change: sample-change\n";
    assert.ok(
      riskArtifactFailures(body, root, {
        changedFiles: [...archiveChanged, "src/core/engine/commands.ts"],
      }).some((failure) => failure.includes("cannot cover a behavior change")),
      "a production change must open a new change, not reuse an archived package",
    );
    assert.ok(
      riskArtifactFailures(body, root).some((failure) =>
        failure.includes("needs the changed-files list"),
      ),
      "archived acceptance needs the changed-files proof",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a storage change needs the state-and-storage delta spec", () => {
  const root = fixture({ specs: "workflow" });
  const body =
    "Issue: #1\nRisk: R3\nPolicy migration: true\nOpenSpec change: openspec/changes/sample-change\n";
  const touched = [
    "openspec/changes/sample-change/proposal.md",
    "openspec/changes/sample-change/specs/workflow/spec.md",
    "src/infrastructure/storage/local-game-storage.ts",
  ];
  try {
    assert.ok(
      riskArtifactFailures(body, root, { changedFiles: touched }).some((failure) =>
        failure.includes("game/state-and-storage delta spec"),
      ),
      "a storage change must name the persistence contract",
    );
    const storageDir = join(root, "openspec/changes/sample-change/specs/game/state-and-storage");
    mkdirSync(storageDir, { recursive: true });
    writeFileSync(join(storageDir, "spec.md"), "### Requirement: Saved game\n");
    assert.deepEqual(riskArtifactFailures(body, root, { changedFiles: touched }), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
