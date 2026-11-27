import assert from "node:assert/strict";
import test from "node:test";
import {
  classify,
  hasEvidence,
  parseChecklist,
  parseIssue,
  parseRequirements,
} from "./openspec-reconcile.ts";

const PATH = "specs/game/role-modules/spec.md";
const BASELINE = "### Requirement: A role module declares its night step\n\nText.\n";

test("a change is archive-ready only with a finished checklist and every requirement in the baseline", () => {
  const tasks = "## Tasks\n- [x] 1.1 Add the test.\n- [X] 1.2 Add the role.\n";
  const checklist = parseChecklist(tasks);
  assert.deepEqual(checklist, { done: 2, total: 2, open: 0 });
  assert.equal(hasEvidence(tasks), false);
  assert.equal(
    hasEvidence(`${tasks}- RED: the test fails on the base.\n- GREEN: the test passes.\n`),
    true,
  );
  assert.equal(parseIssue("# Change\n\nIssue: #519\n"), "#519");
  assert.equal(parseIssue("# Change\n\nNo issue line.\n"), null);
  const requirements = parseRequirements(
    PATH,
    "## MODIFIED Requirements\n\n### Requirement: A role module declares its night step\n\nText.\n",
    (capability) => (capability === "game/role-modules" ? BASELINE : null),
  );
  assert.deepEqual(requirements, [
    {
      capability: "game/role-modules",
      operation: "MODIFIED",
      name: "A role module declares its night step",
      synced: true,
    },
  ]);
  assert.deepEqual(classify(checklist, requirements), {
    status: "archive-ready",
    blockers: [],
    structural: true,
  });
});

test("an unsynced delta and an open task both block an archive", () => {
  const requirements = parseRequirements(
    PATH,
    "## ADDED Requirements\n\n### Requirement: A new rule\n",
    () => BASELINE,
  );
  assert.equal(requirements[0].synced, false);
  const open = { done: 1, total: 2, open: 1 };
  assert.deepEqual(classify(open, requirements), {
    status: "open-tasks",
    blockers: ["open-tasks", "unsynced-delta"],
    structural: false,
  });
  assert.deepEqual(classify({ done: 2, total: 2, open: 0 }, requirements), {
    status: "unsynced-delta",
    blockers: ["unsynced-delta"],
    structural: false,
  });
  assert.deepEqual(classify({ done: 0, total: 0, open: 0 }, [], false), {
    status: "empty-tasks",
    blockers: ["empty-tasks", "missing-evidence", "unsynced-delta"],
    structural: false,
  });
});

test("a removed requirement counts as synced only when the baseline no longer holds it", () => {
  const delta = "## REMOVED Requirements\n\n### Requirement: An obsolete rule\n";
  assert.equal(
    parseRequirements(PATH, delta, () => "### Requirement: An obsolete rule\n")[0].synced,
    false,
  );
  assert.equal(parseRequirements(PATH, delta, () => BASELINE)[0].synced, true);
});

test("a delta that cannot be applied to the baseline is a conflict, not a sync", () => {
  const added = parseRequirements(
    PATH,
    "## ADDED Requirements\n\n### Requirement: A role module declares its night step\n",
    () => BASELINE,
  );
  assert.equal(added[0].synced, true);
  assert.equal(added[0].conflict, "added-but-present");
  assert.deepEqual(classify({ done: 2, total: 2, open: 0 }, added), {
    status: "delta-conflict",
    blockers: ["delta-conflict"],
    structural: false,
  });
  assert.equal(
    parseRequirements(
      PATH,
      "## MODIFIED Requirements\n\n### Requirement: A missing rule\n",
      () => BASELINE,
    )[0].conflict,
    "modified-but-absent",
  );
  assert.equal(
    parseRequirements(
      PATH,
      "## REMOVED Requirements\n\n### Requirement: A missing rule\n",
      () => BASELINE,
    )[0].conflict,
    "removed-but-absent",
  );
});

test("a delta file may mix ADDED and MODIFIED sections", () => {
  const text =
    "## ADDED Requirements\n\n### Requirement: A new rule\n\n## MODIFIED Requirements\n\n### Requirement: A role module declares its night step\n\nText.\n";
  const rows = parseRequirements(PATH, text, () => BASELINE);
  assert.deepEqual(
    rows.map((row) => [row.name, row.operation, row.synced, row.conflict ?? null]),
    [
      ["A new rule", "ADDED", false, null],
      ["A role module declares its night step", "MODIFIED", true, null],
    ],
  );
});

test("a delta without an operation header or capability path is rejected", () => {
  assert.throws(
    () => parseRequirements(PATH, "### Requirement: A rule\n", () => BASELINE),
    /no operation header/,
  );
  assert.throws(
    () =>
      parseRequirements(
        "spec.md",
        "## ADDED Requirements\n\n### Requirement: A rule\n",
        () => BASELINE,
      ),
    /outside a capability/,
  );
});

test("a matching requirement heading with a different body is not a sync", () => {
  const rows = parseRequirements(
    PATH,
    "## MODIFIED Requirements\n\n### Requirement: A role module declares its night step\n\nChanged text.\n",
    () => BASELINE,
  );
  assert.equal(rows[0].synced, false);
  assert.equal(rows[0].conflict, "modified-body-differs");
  assert.deepEqual(classify({ done: 2, total: 2, open: 0 }, rows), {
    status: "unsynced-delta",
    blockers: ["unsynced-delta", "delta-conflict"],
    structural: false,
  });
});

test("missing evidence and empty task lists block an archive separately", () => {
  const requirements = parseRequirements(
    PATH,
    "## MODIFIED Requirements\n\n### Requirement: A role module declares its night step\n\nText.\n",
    () => BASELINE,
  );
  assert.deepEqual(classify({ done: 2, total: 2, open: 0 }, requirements, false), {
    status: "missing-evidence",
    blockers: ["missing-evidence"],
    structural: true,
  });
  assert.deepEqual(classify({ done: 0, total: 0, open: 0 }, requirements), {
    status: "empty-tasks",
    blockers: ["empty-tasks"],
    structural: true,
  });
});

test("a RENAMED operation is rejected explicitly", () => {
  const rows = parseRequirements(
    PATH,
    "## RENAMED Requirements\n\n### Requirement: A renamed rule\n",
    () => BASELINE,
  );
  assert.equal(rows[0].synced, false);
  assert.equal(rows[0].conflict, "renamed-unsupported");
});
