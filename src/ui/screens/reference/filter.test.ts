import assert from "node:assert/strict";
import test from "node:test";
import { matchesReference } from "./filter.ts";

const role = { id: "fortuneteller", name: "Гадалка", edition: "tb" } as const;

test("a host can find a translated character by name or spaced catalog ID within its edition", () => {
  assert.ok(matchesReference(role, "ГАДАЛ", "tb", "ru"));
  assert.ok(matchesReference(role, " Fortune Teller ", "all", "ru"));
  assert.ok(matchesReference(role, "", "tb", "ru"));
  assert.equal(matchesReference(role, "Гадалка", "snv", "ru"), false);
  assert.equal(matchesReference(role, "chef", "all", "ru"), false);
});
