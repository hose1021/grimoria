import type { SheetScenario } from "./screens/sheet-scenarios.ts";

export type SheetEdition = Exclude<SheetScenario, "all">;

export function parseSheetRoute(
  path: string,
): { lang: string | null; edition: SheetEdition | null } | null {
  const match = /^\/sheet(?:\/(ru|en|az)(?:\/(tb|bmr|snv))?)?$/.exec(path);
  if (!match) return null;
  return { lang: match[1] ?? null, edition: (match[2] as SheetEdition | undefined) ?? null };
}

export function sheetPath(lang: string, edition?: SheetEdition | null): string {
  return "/sheet/" + lang + (edition ? "/" + edition : "");
}
