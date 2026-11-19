import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDirectory, extractSpecifiers } from "../../scripts/check-types-policy.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

test("the layered source graph has no forbidden import edge", async () => {
  assert.deepEqual(await checkDirectory(), []);
});

test("the UI reads engine facts through ports and read models, not engine code", () => {
  const files = walk(join(ROOT, "src", "ui"));
  const violations: string[] = [];
  for (const file of files.filter((entry) => !/\.test\.(ts|tsx)$/.test(entry))) {
    const rel = relative(ROOT, file).split("\\").join("/");
    const text = readFileSync(file, "utf8");
    for (const entry of extractSpecifiers(text)) {
      if (entry.specifier && entry.specifier.includes("/core/engine")) {
        violations.push(rel + " imports " + entry.specifier);
      }
    }
  }
  assert.deepEqual(violations, []);
});
