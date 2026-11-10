import test from "node:test";
import assert from "node:assert/strict";
import { checkSource } from "./check-types-policy.mjs";

test("type policy accepts a documented suppression", () => {
  const text = "// @ts-expect-error -- legacy boundary\nconst value = 1;";
  assert.deepEqual(checkSource(text), []);
});

test("type policy rejects @ts-ignore", () => {
  const violations = checkSource("// @ts-ignore\nconst value = 1;");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /@ts-ignore is forbidden/);
});

test("type policy rejects @ts-nocheck", () => {
  const violations = checkSource("// @ts-nocheck");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /@ts-nocheck is forbidden/);
});

test("type policy rejects an unexplained @ts-expect-error", () => {
  const violations = checkSource("// @ts-expect-error\nconst value = 1;");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /needs a reason/);
});
