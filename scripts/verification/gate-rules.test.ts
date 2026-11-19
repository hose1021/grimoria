import test from "node:test";
import assert from "node:assert/strict";
import { coveragePinFailures } from "./gate-rules.ts";

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
