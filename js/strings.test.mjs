import test from "node:test";
import assert from "node:assert/strict";
import { missingTranslations, translationProblems, setUiLang, t } from "./strings.js";

test("English, Russian and Azerbaijani have matching translation keys and parameters", () => {
  assert.deepEqual(translationProblems(), []);
  assert.deepEqual(missingTranslations(), { en: [], ru: [], az: [] });
  for (const lang of ["en", "ru", "az"]) {
    setUiLang(lang);
    assert.match(t("voteMinimum", { count: 3, living: 6 }), /3/);
    assert.doesNotMatch(t("voteMinimum", { count: 3, living: 6 }), /\{/);
  }
});

// The storyteller step contract (issue #45) adds screens and consequences, so
// every one of its keys must reach all three catalogs with the same placeholders.
const STEP_KEYS = [
  "ui.stepWakes",
  "ui.stepAllowed",
  "ui.activeEffects",
  "ui.noActiveEffects",
  "ui.chosenTargets",
  "ui.consequences",
  "ui.previewEmpty",
  "ui.previewNow",
  "ui.previewLater",
  "ui.blockedTitle",
  "ui.blockSecrets",
  "ui.blockTargets",
  "ui.blockGiven",
  "ui.blockRedirect",
  "ui.blockHeir",
  "ui.blockSteps",
  "ui.blockNomination",
  "ui.consequence.target",
  "ui.consequence.applied",
  "ui.consequence.death",
  "ui.consequence.scheduled",
  "ui.consequence.prevented",
  "ui.consequence.revived",
  "ui.consequence.rejected",
  "ui.rejectedTitle",
  "ui.dismiss",
  "ui.resetStep",
];

test("storyteller step guidance is semantically translated in ru, en and az", () => {
  const missing = missingTranslations();
  for (const lang of ["en", "ru", "az"]) {
    assert.deepEqual(
      missing[lang].filter((key) => STEP_KEYS.includes(key)),
      [],
      `${lang} is missing a storyteller step key`,
    );
  }
  const problems = translationProblems().filter((problem) =>
    STEP_KEYS.some((key) => problem.endsWith(":" + key)),
  );
  assert.deepEqual(problems, []);
  const vars = { name: "A", names: "A, B", count: 2 };
  for (const lang of ["en", "ru", "az"]) {
    setUiLang(lang);
    for (const key of STEP_KEYS) {
      const text = t(key, vars);
      assert.ok(text && text !== key, `${lang}:${key} is translated`);
      assert.doesNotMatch(text, /\{\w+\}/, `${lang}:${key} leaves a placeholder`);
    }
  }
  setUiLang("ru");
});

// `guideFor` composes these keys for every step card; the five row labels are
// the ones the card renders around them.
const GUIDE_KEYS = [
  "guidedInstructions",
  "hostAction",
  "playerAction",
  "grimoireNote",
  "publicLine",
  "check",
  "guide.generic.host",
  "guide.generic.grimoire",
  "guide.generic.check",
  "guide.player",
  "guide.public",
  "guide.confirm",
  "guide.bmr.host",
  "guide.bmr.grimoire",
  "guide.bmr.check",
  "guide.sv.host",
  "guide.sv.grimoire",
  "guide.sv.check",
];

test("storyteller guidance rows stay semantically equal in ru, en and az", () => {
  const missing = missingTranslations();
  const problems = translationProblems();
  for (const lang of ["en", "ru", "az"]) {
    assert.deepEqual(
      missing[lang].filter((key) => GUIDE_KEYS.includes(key)),
      [],
      `${lang} is missing a guidance key`,
    );
    for (const key of GUIDE_KEYS) {
      setUiLang(lang);
      const text = t(key);
      assert.ok(text && text !== key, `${lang}:${key} is translated`);
    }
  }
  assert.deepEqual(
    problems.filter((problem) => GUIDE_KEYS.some((key) => problem.endsWith(":" + key))),
    [],
  );
  setUiLang("ru");
});
