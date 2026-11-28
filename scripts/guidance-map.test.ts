import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { sections } from "./guidance-map.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("every root guidance section has a canonical home that exists", () => {
  const map = sections(readFileSync(resolve(ROOT, "AGENTS.md"), "utf8"));
  assert.ok(map.length >= 6, `sections: ${map.length}`);
  const titles = map.map((section) => section.title);
  assert.equal(new Set(titles).size, titles.length, "duplicate section title");
  for (const section of map) {
    if (section.canonical === "root") continue;
    assert.ok(
      existsSync(resolve(ROOT, section.canonical)),
      `${section.title} -> ${section.canonical}`,
    );
  }
  const total = map.reduce((sum, section) => sum + section.bytes, 0);
  assert.ok(total > 0);
});

test("the section scan keeps each heading separate and counts its bytes", () => {
  const map = sections("## One\n\ntext\n\n## Two\n\nmore\n");
  assert.deepEqual(
    map.map((section) => [section.title, section.lines]),
    [
      ["One", 4],
      ["Two", 4],
    ],
  );
});
