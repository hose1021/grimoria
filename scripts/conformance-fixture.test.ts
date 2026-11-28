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
        normalize?: string[];
      };
      publicKeys?: string[];
    }
  >;
};

function withoutAt(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutAt);
  if (typeof value !== "object" || value === null) return value;
  const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  delete copy.at;
  for (const [key, child] of Object.entries(copy)) copy[key] = withoutAt(child);
  return copy;
}

function normalize(value: unknown, drop: string[] = []): unknown {
  if (Array.isArray(value)) return value.map((child) => normalize(child, drop));
  if (typeof value !== "object" || value === null) return value;
  const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of ["updatedAt", "createdAt", "applied", "journal", ...drop]) delete copy[key];
  for (const [key, child] of Object.entries(copy)) copy[key] = normalize(child, []);
  return copy;
}

test("the portable engine contract runs from JSON alone", () => {
  const load = () => JSON.parse(readFileSync(resolve(ROOT, contract.savedGame), "utf8"));
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
  assert.deepEqual(
    normalize(deterministic),
    normalize(secondRun),
    "independent deterministic executions end in the same normalized state",
  );
  assert.deepEqual(
    withoutAt(first),
    withoutAt(second),
    "independent executions return the same command result and event payloads",
  );
  const beforeReapply = normalize(secondRun);
  const journalBefore = secondRun.journal.entries.length;
  const reapply = applyCommand(secondRun, deterministicCase.command);
  assert.equal(reapply.status, "allowed");
  assert.equal((reapply as { idempotent?: boolean }).idempotent, true);
  assert.deepEqual(normalize(secondRun), beforeReapply, "idempotent reapply keeps the state");
  assert.equal(secondRun.journal.entries.length, journalBefore, "idempotent reapply adds no entry");

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
    const normalize = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(normalize);
      if (typeof value !== "object" || value === null) return value;
      const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
      for (const key of ["applied", "journal", ...(replayCase.expected.normalize ?? [])])
        delete copy[key];
      for (const [key, child] of Object.entries(copy)) copy[key] = normalize(child);
      return copy;
    };
    assert.deepEqual(normalize(result.state), normalize(replayed));
    assert.deepEqual(
      withoutAt((result.state.journal as { entries: unknown[] }).entries),
      withoutAt((replayed.journal as { entries: unknown[] }).entries),
      "journal replay preserves the journal contents",
    );
  }

  const projection = contract.cases.projection!;
  const viewed = load();
  assert.equal(applyCommand(viewed, projection.command).status, projection.expected.status);
  const view = publicGameView(viewed) as Record<string, unknown>;
  assert.deepEqual(Object.keys(view).sort(), [...projection.publicKeys!].sort());
});
