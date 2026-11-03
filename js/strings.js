import ru from "./locales/ru.js";
import en from "./locales/en.js";
import az from "./locales/az.js";
const STRINGS = { ru, en, az };

export function missingTranslations() {
  const keys = Object.keys(STRINGS.en);
  return Object.fromEntries(["en", "ru", "az"].map((code) => [code, keys.filter((key) => !STRINGS[code][key])]));
}

export function translationProblems() {
  const parameters = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  return Object.entries(STRINGS).flatMap(([code, dict]) => Object.entries(en).filter(([key, text]) =>
    !dict[key] || parameters(dict[key]) !== parameters(text)).map(([key]) => code + ":" + key));
}

let uiLang = "ru";

export function setUiLang(code) {
  uiLang = STRINGS[code] ? code : "ru";
}

export function getUiLang() {
  return uiLang;
}

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

export function teamText(team) {
  return t({ townsfolk: "townsfolk", outsider: "outsider", minion: "minion", demon: "demon", traveller: "traveller" }[team] || "team");
}
