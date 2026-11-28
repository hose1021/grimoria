import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const boundary = JSON.parse(readFileSync(resolve(ROOT, "contracts/engine-boundary.json"), "utf8"));

test("the engine boundary names only source files that exist", () => {
  assert.equal(boundary.schemaVersion, 1);
  const paths = Object.values(boundary.boundary) as string[];
  assert.ok(paths.length >= 8);
  for (const path of paths) assert.ok(existsSync(resolve(ROOT, path)), path);
});

test("the boundary records its invariants and the conformance pilot status", () => {
  assert.ok(boundary.invariants.length >= 4);
  assert.ok(["ready", "blocked"].includes(boundary.conformancePilot.status));
  if (boundary.conformancePilot.status === "blocked")
    assert.ok(boundary.conformancePilot.reason.length > 40);
  if (boundary.conformancePilot.status === "ready")
    assert.ok(existsSync(resolve(ROOT, boundary.conformancePilot.fixture)));
});
