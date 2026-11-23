import assert from "node:assert/strict";
import test from "node:test";
import { chooseBluff } from "./bluff-selection.ts";

test("a full bluff list replaces its oldest entry on a new pick", () => {
  assert.deepEqual(chooseBluff(["a", "b", "c"], "d", 3), ["b", "c", "d"]);
});

test("a partial bluff list appends the new pick", () => {
  assert.deepEqual(chooseBluff(["a", "b"], "c", 3), ["a", "b", "c"]);
});

test("a repeated bluff pick leaves the list unchanged", () => {
  assert.deepEqual(chooseBluff(["a", "b", "c"], "b", 3), ["a", "b", "c"]);
});
