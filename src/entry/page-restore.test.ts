import assert from "node:assert/strict";
import test from "node:test";
import { needsRestoredHandoff } from "./page-restore.ts";

test("restoring a reading page keeps its history entry while a restored host screen returns to handoff", () => {
  for (const path of [
    "/reference",
    "/reference/chef",
    "/reference/missing",
    "/sheet",
    "/sheet/en/tb",
    "/changelog",
  ]) {
    assert.equal(needsRestoredHandoff(true, path), false, path);
  }
  for (const path of [
    "/table",
    "/bag",
    "/secrets",
    "/player",
    "/sheets",
    "/sheet/en/nope",
    "/reference/chef/extra",
  ]) {
    assert.equal(needsRestoredHandoff(true, path), true, path);
    assert.equal(needsRestoredHandoff(false, path), false, "ordinary load: " + path);
  }
});
