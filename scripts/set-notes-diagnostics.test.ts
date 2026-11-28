import assert from "node:assert/strict";
import test from "node:test";

import { safeDifference } from "./set-notes-diagnostics.ts";

test("a mismatch report carries paths and digests but no values", () => {
  const expected = { notes: "secret note", players: { "1": { roleId: "imp" } } };
  const actual = { notes: "other secret", players: { "1": { roleId: "imp" } } };
  const message = safeDifference("state", expected, actual);
  assert.match(message, /fields \.notes/);
  assert.match(message, /expected [0-9a-f]{24}/);
  assert.doesNotMatch(message, /secret note|other secret|imp/);
});
