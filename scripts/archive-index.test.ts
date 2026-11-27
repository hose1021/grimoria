import assert from "node:assert/strict";
import test from "node:test";
import { entriesFrom } from "./archive-index.ts";

test("the archive index sorts by name and rejects a duplicate entry", () => {
  const rows = [
    { name: "2026-11-02-b", commit: "b".repeat(40), date: "2026-11-02", path: "p/b" },
    { name: "2026-11-01-a", commit: "a".repeat(40), date: "2026-11-01", path: "p/a" },
  ];
  assert.deepEqual(
    entriesFrom(rows).map((entry) => entry.name),
    ["2026-11-01-a", "2026-11-02-b"],
  );
  assert.throws(() => entriesFrom([rows[0], rows[0]]), /duplicate archive entry/);
});
