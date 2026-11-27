import assert from "node:assert/strict";
import test from "node:test";
import { parseReferenceRoute } from "./reference-route.ts";

test("reference routes open the index or decode one character ID", () => {
  assert.deepEqual(parseReferenceRoute("/reference"), { roleId: null });
  assert.deepEqual(parseReferenceRoute("/reference/%63hef"), { roleId: "chef" });
  assert.deepEqual(parseReferenceRoute("/reference/unknown"), { roleId: "unknown" });
});

test("malformed reference paths use the ordinary route fallback", () => {
  for (const path of [
    "/references",
    "/reference/goon/extra",
    "/reference/foo%2Fbar",
    "/reference/%",
    "/sheet",
  ]) {
    assert.equal(parseReferenceRoute(path), null, path);
  }
});
