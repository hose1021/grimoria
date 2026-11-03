import test from "node:test";
import assert from "node:assert/strict";
import { missingTranslations, setUiLang, t } from "./strings.js";

test("English, Russian and Azerbaijani have matching translation keys and parameters", () => {
  assert.deepEqual(missingTranslations(), { en: [], ru: [], az: [] });
  for (const lang of ["en", "ru", "az"]) {
    setUiLang(lang);
    assert.match(t("voteMinimum", { count: 3, living: 6 }), /3/);
    assert.doesNotMatch(t("voteMinimum", { count: 3, living: 6 }), /\{/);
  }
});
