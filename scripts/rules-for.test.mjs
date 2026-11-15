import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "rules-for.mjs");

function run(...args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    return { status: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

test("a supported role prints all five sections", () => {
  const result = run("imp");
  assert.equal(result.status, 0);
  for (const heading of [
    "## Official text",
    "## Matrix rows",
    "## Spec requirements",
    "## Tests carrying the identifiers",
    "## Jinxes",
  ]) {
    assert.ok(result.stdout.includes(heading), `missing ${heading}`);
  }
  assert.match(result.stdout, /Each night\*, choose a player: they die/);
  assert.match(result.stdout, /TB-IMP-01/);
});

test("an unknown role exits non-zero with one message and no other output", () => {
  const result = run("notarole");
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim().split("\n").length, 1);
  assert.match(result.stderr, /unknown role: notarole/);
});

test("a missing argument exits non-zero with one message and no other output", () => {
  const result = run();
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim().split("\n").length, 1);
  assert.match(result.stderr, /usage: node scripts\/rules-for\.mjs <roleId>/);
});
