import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const UI = join(ROOT, "src/ui");
const SCREENS = join(UI, "screens");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) return [];
    if (/\.test(-d)?\.tsx?$/.test(entry.name)) return [];
    return [path];
  });
}

/** Every static import, re-export and literal dynamic import in one file. */
function specifiers(source: string): string[] {
  return [
    ...source.matchAll(/^\s*(?:import|export)[^;]*?from\s+["']([^"']+)["']/gm),
    ...source.matchAll(/^\s*import\s+["']([^"']+)["']/gm),
    ...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
  ].map((match) => match[1]!);
}

function offenders(dir: string, pattern: RegExp): string[] {
  return files(dir).flatMap((path) =>
    specifiers(readFileSync(path, "utf8"))
      .filter((specifier) => pattern.test(specifier))
      .map((specifier) => `${relative(ROOT, path)} imports ${specifier}`),
  );
}

test("no screen module imports the engine or the legacy tree", () => {
  assert.deepEqual(offenders(SCREENS, /core\/engine/), []);
  assert.deepEqual(offenders(SCREENS, /(^|\/)js\//), []);
});

test("no ui module imports the legacy tree", () => {
  assert.deepEqual(offenders(UI, /(^|\/)js\//), []);
});

test("the composition root does not compute rules itself", () => {
  assert.deepEqual(offenders(join(ROOT, "src/entry"), /core\/engine/), []);
});
