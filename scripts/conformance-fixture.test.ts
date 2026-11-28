import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applyCommand, replay } from "../src/core/engine/index.ts";
import type { GameState } from "../src/core/model/types.ts";
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

const contract = JSON.parse(
  readFileSync(resolve(ROOT, "fixtures/conformance/engine-contract.json"), "utf8"),
) as {
  savedGame: string;
  cases: Record<
    string,
    {
      command: { id: string; type: string; payload: Record<string, unknown> };
      expected: {
        status: string;
        notes?: string;
        errorCode?: string;
        events?: string[];
        legacyAppliedIdentities?: Record<string, string>;
      };
      publicKeys?: string[];
    }
  >;
};

test("the portable engine contract runs from JSON alone", () => {
  const load = (): GameState => JSON.parse(readFileSync(resolve(ROOT, contract.savedGame), "utf8"));
  const deterministic = load();
  const first = applyCommand(deterministic, contract.cases.deterministic!.command);
  const deterministicCase = contract.cases.deterministic!;
  assert.equal(first.status, deterministicCase.expected.status);
  assert.equal(deterministic.notes, deterministicCase.expected.notes);
  assert.deepEqual(
    (first as { events?: Array<{ type: string }> }).events?.map((event) => event.type),
    deterministicCase.expected.events,
  );
  const secondRun = load();
  const second = applyCommand(secondRun, deterministicCase.command);
  assert.equal(second.status, deterministicCase.expected.status);
  assert.equal(secondRun.notes, deterministicCase.expected.notes);
  assert.deepEqual(
    (second as { events?: Array<{ type: string }> }).events?.map((event) => event.type),
    deterministicCase.expected.events,
  );
  assert.deepEqual(deterministic, secondRun, "independent runs produce identical full states");
  assert.deepEqual(first, second, "command results include identical event payloads");
  const beforeReapply = structuredClone(secondRun);
  const reapply = applyCommand(secondRun, deterministicCase.command);
  assert.equal(reapply.status, "allowed");
  assert.equal((reapply as { idempotent?: boolean }).idempotent, true);
  assert.deepEqual(
    secondRun,
    beforeReapply,
    "idempotent reapply preserves the full state and journal",
  );

  const rejected = load();
  const before = structuredClone(rejected);
  const unknown = applyCommand(rejected, contract.cases.rejected!.command);
  assert.equal(unknown.status, contract.cases.rejected!.expected.status);
  assert.equal(
    (unknown as { errorCode?: string }).errorCode,
    contract.cases.rejected!.expected.errorCode,
  );
  assert.deepEqual(rejected, before);

  const replayCase = contract.cases.replay!;
  const replayed = load();
  assert.equal(applyCommand(replayed, replayCase.command).status, replayCase.expected.status);
  const result = replay(replayed.journal);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.notes, replayCase.expected.notes);
    // Replay upgrades legacy full fingerprints to compact command identities.
    const expectedState = structuredClone(replayed);
    for (const [id, identity] of Object.entries(
      replayCase.expected.legacyAppliedIdentities ?? {},
    )) {
      const entry = expectedState.applied[id];
      assert.ok(entry?.fingerprint, `expected a legacy fingerprint for ${id}`);
      delete entry.fingerprint;
      entry.identity = identity;
    }
    assert.deepEqual(result.state, expectedState);
  }

  const projection = contract.cases.projection!;
  const viewed = load();
  assert.equal(applyCommand(viewed, projection.command).status, projection.expected.status);
  const view = publicGameView(viewed) as Record<string, unknown>;
  assert.deepEqual(Object.keys(view).sort(), [...projection.publicKeys!].sort());
});
