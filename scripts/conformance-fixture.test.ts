import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applyCommand, replay } from "../src/core/engine/index.ts";
import { publicGameView } from "../src/core/model/state.ts";

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

function loadState() {
  return JSON.parse(readFileSync(resolve(ROOT, fixture.savedGame), "utf8"));
}

test("a rejected command leaves the saved state unchanged", () => {
  const state = loadState();
  const before = structuredClone(state);
  const result = applyCommand(state, {
    id: "conformance-unknown",
    type: "doesNotExist",
    payload: {},
  });
  assert.equal(result.status, "rejected");
  assert.equal((result as { errorCode?: string }).errorCode, "command-unknown");
  assert.deepEqual(state, before);
});

test("the journal replays the accepted commands to the saved state", () => {
  const state = loadState();
  const allowed = applyCommand(state, {
    id: "conformance-replay",
    type: "setNotes",
    payload: { notes: "replayed" },
  });
  assert.equal(allowed.status, "allowed");
  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, replayed.ok ? "" : replayed.error);
  if (replayed.ok) {
    assert.equal(replayed.state.notes, "replayed");
    assert.deepEqual(replayed.state.order, state.order);
  }
});

test("the public projection exposes aggregates only", () => {
  const state = loadState();
  applyCommand(state, {
    id: "conformance-projection",
    type: "setNotes",
    payload: { notes: "secret" },
  });
  const view = publicGameView(state) as Record<string, unknown>;
  assert.deepEqual(Object.keys(view).sort(), [
    "day",
    "deaths",
    "living",
    "night",
    "phase",
    "total",
    "winner",
  ]);
  assert.equal(JSON.stringify(view).includes("secret"), false);
  assert.equal(JSON.stringify(view).includes("role"), false);
});
