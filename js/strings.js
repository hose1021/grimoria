// @ts-check
import ru from "./locales/ru.js";
import en from "./locales/en.js";
import az from "./locales/az.js";
/** @typedef {Record<string, string>} Dict */
/** @type {Record<string, Dict>} */
const STRINGS = { ru, en, az };

/** @returns {Record<string, string[]>} */
export function missingTranslations() {
  const keys = Object.keys(STRINGS.en);
  return Object.fromEntries(
    ["en", "ru", "az"].map((code) => [code, keys.filter((key) => !STRINGS[code][key])]),
  );
}

/** @returns {string[]} */
export function translationProblems() {
  /** @param {string} text */
  const parameters = (text) =>
    [...text.matchAll(/\{(\w+)\}/g)]
      .map((m) => m[1])
      .sort()
      .join(",");
  return Object.entries(STRINGS).flatMap(([code, dict]) =>
    Object.entries(en)
      .filter(([key, text]) => !dict[key] || parameters(dict[key]) !== parameters(text))
      .map(([key]) => code + ":" + key),
  );
}

let uiLang = "ru";

/** @param {string} code @returns {void} */
export function setUiLang(code) {
  uiLang = STRINGS[code] ? code : "ru";
}

/** @returns {string} */
export function getUiLang() {
  return uiLang;
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} [vars]
 * @returns {string}
 */
export function t(key, vars) {
  const dict = STRINGS[uiLang] || STRINGS.ru;
  let text = dict[key] || STRINGS.en[key] || key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll("{" + name + "}", String(value));
    }
  }
  return text;
}

/** @type {Record<string, string>} */
const TEAM_KEYS = {
  townsfolk: "townsfolk",
  outsider: "outsider",
  minion: "minion",
  demon: "demon",
  traveller: "traveller",
};

/** @param {string} team @returns {string} */
export function teamText(team) {
  return t(TEAM_KEYS[team] || "team");
}

/** @param {unknown} result @returns {string} */
export function errorMessage(result) {
  const failure = /** @type {{ errorCode?: string | null, error?: string } | null | undefined} */ (
    result
  );
  return failure?.errorCode ? t(failure.errorCode) : failure?.error || t("notAvailable");
}

/** @param {number | string} [count] @returns {string} */
export function roleCount(count) {
  const value = Math.max(0, Number(count) || 0);
  if (uiLang === "ru") {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return "роль";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "роли";
    return "ролей";
  }
  if (uiLang === "az") return "rol";
  return value === 1 ? "role" : "roles";
}
