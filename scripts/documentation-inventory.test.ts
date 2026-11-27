import assert from "node:assert/strict";
import test from "node:test";
import { inventory } from "./documentation-inventory.ts";

function blob(path: string, bytes: number): string {
  return `100644 blob ${"a".repeat(40)} ${bytes}\t${path}\0`;
}

test("counts committed blobs and separates active and archived OpenSpec changes", () => {
  const result = inventory(
    blob("AGENTS.md", 10) +
      blob("src/role.ts", 20) +
      blob("src/role.test.ts", 30) +
      blob("openspec/changes/fix-a/proposal.md", 5) +
      blob("openspec/changes/fix-a/tasks.md", 6) +
      blob("openspec/changes/archive/old/design.md", 7) +
      blob("openspec/specs/game/spec.md", 8) +
      blob("docs/audits/a report.MD", 9) +
      `160000 commit ${"b".repeat(40)} -\tvendor\0`,
  );
  assert.deepEqual(result.total, { files: 8, bytes: 95, markdownFiles: 6, markdownBytes: 45 });
  assert.equal(result.activeChanges, 1);
  assert.equal(result.archivedChanges, 1);
  assert.equal(result.sourceTypeScriptFiles, 2);
  assert.equal(result.sourceTypeScriptBytes, 50);
  assert.equal(result.rootAgentBytes, 10);
  assert.equal(result.groups["openspec/active"].markdownFiles, 2);
  assert.equal(result.groups["openspec/archive"].markdownFiles, 1);
  assert.equal(result.groups["docs/audits"].markdownBytes, 9);
});

test("reports an empty tree and rejects malformed input instead of undercounting", () => {
  assert.equal(inventory("").total.files, 0);
  assert.throws(() => inventory("invalid\0"), /Unexpected git ls-tree record/);
});
