import assert from "node:assert/strict";
import test from "node:test";
import { applyCommand, previewCommand, replay } from "../src/core/engine/index.ts";
import {
  APPLY_MEASURED_PREFIX,
  APPLY_WARMUP_PREFIX,
  PREVIEW_MEASURED_PREFIX,
  PREVIEW_WARMUP_PREFIX,
  applyWorkload,
  buildLargeJournal,
  idempotentWorkload,
  previewWorkload,
  setNotesCommand,
} from "./engine-benchmark.ts";

test("apply and preview workloads use disjoint command identities", () => {
  assert.notEqual(APPLY_MEASURED_PREFIX, APPLY_WARMUP_PREFIX);
  assert.notEqual(PREVIEW_MEASURED_PREFIX, PREVIEW_WARMUP_PREFIX);
  assert.notEqual(APPLY_MEASURED_PREFIX, PREVIEW_MEASURED_PREFIX);
});

test("every measured apply is the first, non-idempotent execution", () => {
  const workload = applyWorkload();
  for (const command of workload.commands.slice(0, 25)) {
    const result = applyCommand(workload.state, command);
    assert.equal(result.status, "allowed", JSON.stringify(result));
    assert.equal("idempotent" in result && result.idempotent, false);
  }
});

test("preview commands are allowed and do not mutate the preview state", () => {
  const workload = previewWorkload();
  const before = JSON.stringify(workload.state);
  for (const command of workload.commands.slice(0, 25)) {
    const result = previewCommand(workload.state, command);
    assert.equal(result.status, "allowed", JSON.stringify(result));
  }
  assert.equal(JSON.stringify(workload.state), before);
});

test("idempotency is measured on a repeated command identity", () => {
  const workload = idempotentWorkload();
  assert.equal(applyCommand(workload.state, workload.command).status, "allowed");
  const repeated = applyCommand(workload.state, workload.command);
  assert.equal(repeated.status, "allowed");
  assert.equal("idempotent" in repeated && repeated.idempotent, true);
});

test("the large journal workload has unique identities and replays", () => {
  const journal = buildLargeJournal(1000);
  assert.equal(journal.entries.length, 1000);
  assert.equal(new Set(journal.entries.map((entry) => entry.id)).size, 1000);
  assert.equal(replay(journal).ok, true);
});

test("setNotes commands carry the requested prefix and index", () => {
  const command = setNotesCommand("sample-", 7);
  assert.equal(command.id, "sample-7");
  assert.equal(command.type, "setNotes");
});
