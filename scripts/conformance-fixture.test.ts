import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applyCommand } from "../src/core/engine/index.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(
  readFileSync(resolve(ROOT, "fixtures/conformance/legacy-setup-zero.json"), "utf8"),
) as {
  fixtureVersion: number;
  id: string;
  savedGame: string;
  steps: Array<{
    command: { id: string; type: string; payload: Record<string, unknown> };
    expected: { status: string; notes: string };
  }>;
};

test("the portable fixture replays a committed legacy save through the engine", () => {
  assert.equal(fixture.fixtureVersion, 1);
  const state = JSON.parse(readFileSync(resolve(ROOT, fixture.savedGame), "utf8"));
  for (const step of fixture.steps) {
    const result = applyCommand(state, step.command);
    assert.equal(result.status, step.expected.status);
    assert.equal(state.notes, step.expected.notes);
  }
});
