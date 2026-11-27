import assert from "node:assert/strict";
import test from "node:test";
import { parseSheetRoute, sheetPath } from "./sheet-route.ts";

test("edition links preserve their language and select the named edition", () => {
  for (const lang of ["ru", "en", "az"]) {
    for (const edition of ["tb", "bmr", "snv"] as const) {
      const path = sheetPath(lang, edition);
      assert.deepEqual(parseSheetRoute(path), { lang, edition });
    }
  }
});

test("ordinary sheet links leave the edition to the reading preference", () => {
  assert.deepEqual(parseSheetRoute("/sheet"), { lang: null, edition: null });
  assert.deepEqual(parseSheetRoute(sheetPath("az")), { lang: "az", edition: null });
  assert.equal(parseSheetRoute("/table"), null);
  assert.equal(parseSheetRoute("/sheet/en/unknown"), null);
});
