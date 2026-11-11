import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ru from "./locales/ru.ts";
import en from "./locales/en.ts";
import az from "./locales/az.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const CATALOGS: Record<string, Record<string, string>> = { ru, en, az };

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) return [];
    if (/\.test-d?\.tsx?$/.test(entry.name)) return [];
    return [path];
  });
}

test("UI catalogs contain no em dash", () => {
  const offenders = Object.entries(CATALOGS).flatMap(([lang, dict]) =>
    Object.entries(dict)
      .filter(([, text]) => text.includes("—"))
      .map(([key]) => `${lang}:${key}`),
  );
  assert.deepEqual(offenders, []);
});

test("every literal key a screen requests exists in all catalogs", () => {
  const requested = new Map<string, string[]>();
  for (const file of [...sourceFiles("src/ui"), ...sourceFiles("src/entry")]) {
    const source = readFileSync(join(ROOT, file), "utf8");
    for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']\s*[,)]/g)) {
      const key = match[1]!;
      requested.set(key, [...(requested.get(key) ?? []), relative(ROOT, join(ROOT, file))]);
    }
  }
  const missing = [...requested].flatMap(([key, files]) =>
    Object.entries(CATALOGS)
      .filter(([, dict]) => !dict[key])
      .map(([lang]) => `${lang}:${key} (${files[0]})`),
  );
  assert.deepEqual(missing, []);
});
