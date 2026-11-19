import test from "node:test";
import assert from "node:assert/strict";
import {
  coveragePinFailures,
  downgradeFailures,
  officialRuleStatus,
  verifiedCitationFailure,
} from "./gate-rules.ts";

test("a removed test fails without an allowlist entry", () => {
  assert.deepEqual(
    coveragePinFailures({
      before: [{ key: "a.test.ts::kept" }, { key: "a.test.ts::gone" }],
      after: [{ key: "a.test.ts::kept" }],
      allow: {},
    }),
    ["test removed without a removed-tests.json entry: a.test.ts::gone"],
  );
});

test("an allowlisted removal passes and needs a reason", () => {
  const before = [{ key: "a.test.ts::gone" }];
  assert.deepEqual(
    coveragePinFailures({ before, after: [], allow: { "a.test.ts::gone": "merged into kept" } }),
    [],
  );
  assert.deepEqual(coveragePinFailures({ before, after: [], allow: { "a.test.ts::gone": " " } }), [
    "removed-tests.json needs a reason for a.test.ts::gone",
  ]);
});

test("a test that becomes skipped counts as removed coverage", () => {
  assert.deepEqual(
    coveragePinFailures({
      before: [{ key: "a.test.ts::was-run" }],
      after: [{ key: "a.test.ts::was-run", skipped: true }],
      allow: {},
    }),
    ["test became skipped without a removed-tests.json entry: a.test.ts::was-run"],
  );
});

test("an allowlist entry for a living test is stale and fails", () => {
  assert.deepEqual(
    coveragePinFailures({
      before: [{ key: "a.test.ts::alive" }],
      after: [{ key: "a.test.ts::alive" }],
      allow: { "a.test.ts::alive": "not removed after all" },
    }),
    ["removed-tests.json lists a.test.ts::alive, which still exists"],
  );
});

test("an official rule without an atomic entry is role-level, never verified", () => {
  assert.equal(
    officialRuleStatus({ mapped: false, engineRuleIds: ["TB-EMPATH-01"], levels: ["verified"] }),
    "ROLE_LEVEL_ONLY",
  );
  assert.equal(officialRuleStatus({ mapped: false, engineRuleIds: [], levels: [] }), "UNMAPPED");
});

test("an atomic entry over one verified row is verified", () => {
  assert.equal(
    officialRuleStatus({ mapped: true, engineRuleIds: ["SYS-WINS-02"], levels: ["verified"] }),
    "ENGINE_VERIFIED",
  );
  assert.equal(
    officialRuleStatus({ mapped: true, engineRuleIds: ["TB-EMPATH-01"], levels: ["verified"] }),
    "ENGINE_VERIFIED",
  );
});

test("an atomic entry with a host-choice row is partial", () => {
  assert.equal(
    officialRuleStatus({
      mapped: true,
      engineRuleIds: ["TB-EMPATH-01", "TB-EMPATH-02"],
      levels: ["host-choice", "verified"],
    }),
    "ENGINE_PARTIAL",
  );
});

test("a missing citing test fails a verified rule", () => {
  const key = "a.test.ts::a test without the id";
  assert.equal(
    verifiedCitationFailure({
      ruleId: "SYS-WINS-02",
      citations: [{ file: "a.test.ts", name: "a test without the id" }],
      entries: new Map([[key, { key }]]),
    }),
    "verified engine rule SYS-WINS-02 has no current citing test whose name carries the rule id",
  );
});

test("a skipped citing test fails a verified rule", () => {
  const key = "a.test.ts::a demon win test (SYS-WINS-02)";
  assert.equal(
    verifiedCitationFailure({
      ruleId: "SYS-WINS-02",
      citations: [{ file: "a.test.ts", name: "a demon win test (SYS-WINS-02)" }],
      entries: new Map([[key, { key, skipped: true }]]),
    }),
    "verified engine rule SYS-WINS-02 cites a skipped test: a.test.ts::a demon win test (SYS-WINS-02)",
  );
});

test("a running citing test passes a verified rule", () => {
  const key = "a.test.ts::a demon win test (SYS-WINS-02)";
  assert.equal(
    verifiedCitationFailure({
      ruleId: "SYS-WINS-02",
      citations: [{ file: "a.test.ts", name: "a demon win test (SYS-WINS-02)" }],
      entries: new Map([[key, { key }]]),
    }),
    null,
  );
});

test("dropping an atomic mapping fails without an allowlist entry", () => {
  assert.deepEqual(
    downgradeFailures({ before: ["WIN-001", "VOTE-003"], after: ["VOTE-003"], allow: {} }),
    ["atomic mapping for WIN-001 was removed without a removed-verification.json entry"],
  );
});

test("an allowlisted downgrade passes, and a stale allowlist entry fails", () => {
  assert.deepEqual(
    downgradeFailures({
      before: ["WIN-001"],
      after: [],
      allow: { "WIN-001": "statement broader than the row; reopened the review" },
    }),
    [],
  );
  assert.deepEqual(
    downgradeFailures({ before: ["WIN-001"], after: ["WIN-001"], allow: { "WIN-001": "kept" } }),
    ["removed-verification.json lists WIN-001, which is still mapped"],
  );
});
