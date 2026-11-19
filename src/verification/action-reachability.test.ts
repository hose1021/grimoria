import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { commandReferences } from "../../scripts/verification/source-text.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const scope = JSON.parse(
  readFileSync(join(ROOT, "docs", "audits", "verification-gates", "command-scope.json"), "utf8"),
) as {
  ui: string[];
  product: string[];
  internal: string[];
  missing: Record<string, string>;
};

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(relative(ROOT, path).split("\\").join("/"));
  }
  return out;
}

function commandTypes(): string[] {
  const text = readFileSync(join(ROOT, "src", "core", "commands", "contracts.ts"), "utf8");
  const block = /export const COMMAND_TYPES = \[([\s\S]*?)\] as const;/.exec(text);
  assert.ok(block);
  return [...block[1].matchAll(/"([A-Za-z]+)"/g)].map((match) => match[1]);
}

test("every command has exactly one reachability classification", () => {
  const categories = new Map<string, string>();
  for (const [category, list] of [
    ["ui", scope.ui],
    ["product", scope.product],
    ["internal", scope.internal],
  ] as const) {
    for (const command of list) {
      assert.equal(categories.has(command), false, command + " is classified twice");
      categories.set(command, category);
    }
  }
  for (const command of Object.keys(scope.missing)) {
    assert.equal(categories.has(command), false, command + " is also classified");
    categories.set(command, "missing");
  }
  for (const command of commandTypes()) {
    assert.ok(categories.has(command), "unclassified command " + command);
  }
});

test("every UI-classified command has a dispatch site", () => {
  const text = [...sourceFiles(join(ROOT, "src", "ui")), ...sourceFiles(join(ROOT, "src", "entry"))]
    .map((file) => readFileSync(join(ROOT, file), "utf8"))
    .join("\n");
  for (const command of scope.ui) {
    assert.ok(
      commandReferences(text, command) > 0,
      "no dispatch site outside comments for " + command,
    );
  }
});

test("a missing action is explicit, linked to an issue and never silent", () => {
  for (const [command, issue] of Object.entries(scope.missing)) {
    assert.match(issue, /^#\d+/);
    assert.ok(command.length > 0);
  }
});
