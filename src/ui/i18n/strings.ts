import ru from "./locales/ru.ts";
import en from "./locales/en.ts";
import az from "./locales/az.ts";

type Dict = Record<string, string>;
const STRINGS: Record<string, Dict> = { ru, en, az };

export function missingTranslations(): Record<string, string[]> {
  const keys = Object.keys(STRINGS.en!);
  const entries: Array<[string, string[]]> = ["en", "ru", "az"].map((code) => [
    code,
    keys.filter((key) => !STRINGS[code]![key]),
  ]);
  return Object.fromEntries(entries);
}

export function translationProblems(): string[] {
  const parameters = (text: string) =>
    [...text.matchAll(/\{(\w+)\}/g)]
      .map((m) => m[1])
      .sort()
      .join(",");
  return Object.entries(STRINGS).flatMap(([code, dict]) =>
    Object.entries(en)
      .filter(([key, text]) => {
        const value = dict[key];
        return !value || parameters(value) !== parameters(text);
      })
      .map(([key]) => code + ":" + key),
  );
}

let uiLang = "ru";

export function setUiLang(code: string): void {
  uiLang = STRINGS[code] ? code : "ru";
}

export function getUiLang(): string {
  return uiLang;
}

export function t(key: string, vars?: Record<string, unknown>): string {
  const dict = STRINGS[uiLang] || STRINGS.ru!;
  let text = dict[key] || STRINGS.en![key] || key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll("{" + name + "}", String(value));
    }
  }
  return text;
}

const TEAM_KEYS: Record<string, string> = {
  townsfolk: "townsfolk",
  outsider: "outsider",
  minion: "minion",
  demon: "demon",
  traveller: "traveller",
};

export function teamText(team: string): string {
  return t(TEAM_KEYS[team] || "team");
}

export function errorMessage(result: unknown): string {
  const failure = result as { errorCode?: string | null; error?: string } | null | undefined;
  return failure?.errorCode ? t(failure.errorCode) : failure?.error || t("notAvailable");
}

export function roleCount(count?: number | string): string {
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
