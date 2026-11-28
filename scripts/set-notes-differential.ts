import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import { prepareCommand } from "../src/core/commands/prepare.ts";
import { applyCommand, previewCommand, validateCommand } from "../src/core/engine/commands.ts";
import { replay } from "../src/core/engine/replay.ts";
import {
  RULESET_VERSION,
  SUPPORTED_RULESET_VERSIONS,
} from "../src/core/engine/command-versions.ts";
import type { GameState } from "../src/core/model/types.ts";
import { safeDifference } from "./set-notes-diagnostics.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const moduleIndex = args.indexOf("--module");
const modulePath = moduleIndex >= 0 ? args[moduleIndex + 1] : null;
const injectDivergence = args.includes("--inject-divergence");
assert.ok(modulePath, "usage: node scripts/set-notes-differential.ts --module <generated.js>");
const generated = resolve(modulePath);
writeFileSync(join(dirname(generated), "package.json"), '{"type":"commonjs"}\n');
const wasm = createRequire(import.meta.url)(generated) as {
  set_notes_prepare: (command: string, inputs: string) => string;
  set_notes_validate: (state: string, command: string, inputs: string) => string;
  set_notes_preview: (state: string, command: string, inputs: string) => string;
  set_notes_apply: (state: string, command: string, inputs: string) => string;
  set_notes_replay: (state: string) => string;
  state_roundtrip: (state: string) => string;
};

type Case = {
  id: string;
  command: Record<string, unknown>;
  inputs: { timestamp: string; seed: string; id: string };
};

const CASES = JSON.parse(
  readFileSync(join(ROOT, "fixtures/conformance/set-notes-cases.json"), "utf8"),
) as { cases: Case[] };
const LEGACY = readFileSync(
  join(ROOT, "src/core/engine/fixtures/legacy-setup-zero-game.json"),
  "utf8",
);

function ports(inputs: { timestamp: string; id: string }) {
  return {
    ids: { next: () => inputs.id },
    clock: { now: () => new Date(inputs.timestamp) },
    rulesetVersion: RULESET_VERSION,
    supportedRulesetVersions: SUPPORTED_RULESET_VERSIONS,
  };
}

function prepare(caseFile: Case) {
  return prepareCommand(caseFile.command as never, ports(caseFile.inputs));
}

function stateCopy(state: unknown): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function compare(label: string, expected: unknown, actual: unknown) {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(safeDifference(label, expected, actual));
  }
  if (typeof expected === "object" && expected !== null && !Array.isArray(expected)) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${label}: wire order differs`);
    }
  }
}

function rust(
  command: string,
  inputs: unknown,
  state: unknown,
  operation: "apply" | "preview" | "validate",
) {
  const fn =
    operation === "apply"
      ? wasm.set_notes_apply
      : operation === "preview"
        ? wasm.set_notes_preview
        : wasm.set_notes_validate;
  return JSON.parse(fn(JSON.stringify(state), command, JSON.stringify(inputs))) as {
    result?: unknown;
    state?: Record<string, unknown>;
    status?: string;
    errorCode?: string;
  };
}

const legacyState = JSON.parse(LEGACY) as GameState;
const supportedBase = stateCopy(legacyState);
supportedBase.effects = [];

let checked = 0;
for (const caseFile of CASES.cases) {
  const tsPrepared = prepare(caseFile);
  const rustPrepared = JSON.parse(
    wasm.set_notes_prepare(JSON.stringify(caseFile.command), JSON.stringify(caseFile.inputs)),
  ) as { ok: boolean; command?: unknown; errorCode?: string };
  if (caseFile.id === "unsupported-command") {
    assert.equal(rustPrepared.ok, false, caseFile.id);
    assert.equal(rustPrepared.errorCode, "command-unknown", caseFile.id);
    const base = stateCopy(supportedBase);
    const result = rust(JSON.stringify(caseFile.command), caseFile.inputs, base, "apply");
    assert.equal(result.result && (result.result as { status: string }).status, "rejected");
    compare(`${caseFile.id}: state`, base, result.state);
    checked += 1;
    continue;
  }
  compare(`${caseFile.id}: prepare`, tsPrepared, rustPrepared);
  if (!tsPrepared.ok) {
    const base = stateCopy(supportedBase);
    const result = rust(JSON.stringify(caseFile.command), caseFile.inputs, base, "apply");
    assert.equal(
      (result.result as { errorCode?: string } | undefined)?.errorCode ?? result.errorCode,
      tsPrepared.errorCode,
      caseFile.id,
    );
    compare(`${caseFile.id}: rejection state`, base, result.state ?? base);
    checked += 1;
    continue;
  }

  const prepared = tsPrepared.command;
  const base = stateCopy(supportedBase);
  const tsState = stateCopy(base);
  const tsResult = applyCommand(tsState, prepared);
  const rustApply = rust(JSON.stringify(caseFile.command), caseFile.inputs, base, "apply");
  compare(`${caseFile.id}: result`, tsResult, rustApply.result);
  compare(`${caseFile.id}: state`, tsState, rustApply.state);

  const validateBase = stateCopy(base);
  const tsValidate = validateCommand(validateBase, prepared);
  const rustValidate = rust(JSON.stringify(caseFile.command), caseFile.inputs, base, "validate");
  compare(`${caseFile.id}: validate`, tsValidate, rustValidate);
  compare(`${caseFile.id}: validate state`, base, validateBase);

  const previewBase = stateCopy(base);
  const tsPreview = previewCommand(previewBase, prepared);
  const rustPreview = rust(JSON.stringify(caseFile.command), caseFile.inputs, base, "preview");
  compare(`${caseFile.id}: preview`, tsPreview, rustPreview);
  compare(`${caseFile.id}: preview state`, base, previewBase);

  const replaySeed = stateCopy(base);
  replaySeed.journal = { base: null, entries: [] };
  replaySeed.applied = {};
  const replayState = stateCopy(replaySeed);
  applyCommand(replayState, prepared);
  const replayTs = replay(replayState.journal as never);
  assert.equal(replayTs.ok, true, `${caseFile.id}: TypeScript replay`);
  const rustReplayState = rust(
    JSON.stringify(caseFile.command),
    caseFile.inputs,
    replaySeed,
    "apply",
  );
  const replayRust = JSON.parse(wasm.set_notes_replay(JSON.stringify(rustReplayState.state)));
  assert.equal(replayRust.ok, true, `${caseFile.id}: Rust replay`);
  compare(`${caseFile.id}: replay state`, replayTs.state, replayRust.state);
  compare(`${caseFile.id}: replay events`, replayTs.events, replayRust.events);

  const duplicateState = stateCopy(tsState);
  const duplicateTs = applyCommand(duplicateState, prepared);
  const duplicateRust = rust(
    JSON.stringify(caseFile.command),
    caseFile.inputs,
    rustApply.state,
    "apply",
  );
  compare(`${caseFile.id}: idempotent result`, duplicateTs, duplicateRust.result);
  compare(`${caseFile.id}: idempotent state`, duplicateState, duplicateRust.state);

  const conflict = { ...prepared, payload: { notes: "different" } };
  const conflictState = stateCopy(tsState);
  const conflictTs = applyCommand(conflictState, conflict);
  const conflictRust = rust(JSON.stringify(conflict), caseFile.inputs, rustApply.state, "apply");
  compare(`${caseFile.id}: conflict result`, conflictTs, conflictRust.result);
  compare(`${caseFile.id}: conflict state`, conflictState, conflictRust.state);

  if (injectDivergence) {
    const injected = JSON.parse(JSON.stringify(rustApply.result)) as Record<string, unknown>;
    injected.id = "injected-divergence";
    let detected = false;
    try {
      compare(`${caseFile.id}: injected`, tsResult, injected);
    } catch {
      detected = true;
    }
    assert.equal(detected, true, `${caseFile.id}: injected divergence was not detected`);
  }
  checked += 1;
}

// Every historical ruleset the TypeScript runtime accepts.
let rulesetIndex = 0;
for (const version of SUPPORTED_RULESET_VERSIONS) {
  const caseFile: Case = {
    id: `ruleset-${version}`,
    command: {
      id: `slice-ruleset-${rulesetIndex}`,
      type: "setNotes",
      payload: { notes: `ruleset ${version}` },
      at: "2026-11-28T01:00:00.000Z",
      rulesetVersion: version,
    },
    inputs: {
      timestamp: "2026-11-28T01:00:00.000Z",
      seed: "seed-ruleset",
      id: `slice-ruleset-${rulesetIndex}`,
    },
  };
  rulesetIndex += 1;
  const prepared = prepare(caseFile);
  const rustPrepared = JSON.parse(
    wasm.set_notes_prepare(JSON.stringify(caseFile.command), JSON.stringify(caseFile.inputs)),
  );
  compare(`${caseFile.id}: prepare`, prepared, rustPrepared);
  if (!prepared.ok) continue;
  const base = stateCopy(supportedBase);
  const tsState = stateCopy(base);
  const tsResult = applyCommand(tsState, prepared.command);
  const rustApply = rust(JSON.stringify(caseFile.command), caseFile.inputs, base, "apply");
  compare(`${caseFile.id}: result`, tsResult, rustApply.result);
  compare(`${caseFile.id}: state`, tsState, rustApply.state);
  checked += 1;
}
assert.equal(rulesetIndex, SUPPORTED_RULESET_VERSIONS.size, "every ruleset is exercised");

// Multiple sequential non-undoable notes coalesce exactly like TypeScript.
{
  const commands = ["one", "two"].map(
    (notes, index) =>
      ({
        id: `slice-sequence-${index}`,
        type: "setNotes",
        payload: { notes },
        at: `2026-11-28T02:0${index}:00.000Z`,
      }) as Record<string, unknown>,
  );
  const inputs = { timestamp: "2026-11-28T02:00:00.000Z", seed: "seed-seq", id: "unused" };
  const tsState = stateCopy(supportedBase);
  const rustState = stateCopy(supportedBase);
  tsState.journal = { base: null, entries: [] };
  tsState.applied = {};
  rustState.journal = { base: null, entries: [] };
  rustState.applied = {};
  for (const command of commands) {
    const prepared = prepare({ id: String(command.id), command, inputs });
    assert.equal(prepared.ok, true);
    applyCommand(tsState, prepared.command);
    const applied = rust(JSON.stringify(command), inputs, rustState, "apply");
    Object.assign(rustState, applied.state);
  }
  compare("sequence: state", tsState, rustState);
  assert.equal((tsState.journal.entries as unknown[]).length, 1, "TypeScript coalesces");
  checked += 1;
}

// Active marker effects appear; inactive delayed effects are excluded.
{
  const effectBase = stateCopy(supportedBase);
  effectBase.effects = [
    {
      id: "marker-active",
      kind: "marker",
      sourceId: "1",
      targetId: "2",
      start: { phase: "night", number: 1 },
      expires: { phase: "night", number: 3 },
      active: true,
    },
    {
      id: "marker-inactive",
      kind: "marker",
      sourceId: "1",
      targetId: "2",
      start: { phase: "night", number: 1 },
      expires: { phase: "night", number: 3 },
      active: false,
    },
  ] as never;
  const command = {
    id: "slice-effects",
    type: "setNotes",
    payload: { notes: "effects" },
    at: "2026-11-28T03:00:00.000Z",
  };
  const inputs = {
    timestamp: "2026-11-28T03:00:00.000Z",
    seed: "seed-effects",
    id: "slice-effects",
  };
  const prepared = prepare({ id: "effects", command, inputs });
  assert.equal(prepared.ok, true);
  const previewBase = stateCopy(effectBase);
  const tsPreview = previewCommand(previewBase, prepared.command);
  const rustPreview = rust(JSON.stringify(command), inputs, effectBase, "preview");
  compare("effects: preview", tsPreview, rustPreview);
  checked += 1;
}

// Unsupported impairment state is rejected without mutation.
{
  const unsupported = stateCopy(supportedBase);
  unsupported.effects = [
    {
      id: "impairing",
      kind: "poison",
      sourceId: "1",
      targetId: "2",
      start: { phase: "night", number: 1 },
      expires: null,
      active: true,
    },
  ] as never;
  const before = JSON.stringify(unsupported);
  const command = {
    id: "slice-unsupported-state",
    type: "setNotes",
    payload: { notes: "x" },
    at: "2026-11-28T03:30:00.000Z",
  };
  const result = rust(
    JSON.stringify(command),
    {
      timestamp: "2026-11-28T03:30:00.000Z",
      seed: "seed-unsupported",
      id: "slice-unsupported-state",
    },
    unsupported,
    "apply",
  );
  assert.equal((result.result as { errorCode?: string }).errorCode, "unsupported-state");
  compare("unsupported state is unchanged", JSON.parse(before), unsupported);
  const preview = rust(
    JSON.stringify(command),
    {
      timestamp: "2026-11-28T03:30:00.000Z",
      seed: "seed-unsupported",
      id: "slice-unsupported-state",
    },
    unsupported,
    "preview",
  );
  assert.equal((preview as { errorCode?: string }).errorCode, "unsupported-state");
  compare("unsupported preview is unchanged", JSON.parse(before), unsupported);
  checked += 1;
}

// Replay errors preserve journal-invalid versus journal-dependency and state.
{
  const base = stateCopy(supportedBase);
  delete (base as { journal?: unknown }).journal;
  const before = JSON.stringify(base);
  const rustMissing = JSON.parse(wasm.set_notes_replay(JSON.stringify(base)));
  const tsMissing = replay(undefined as never);
  compare("replay missing journal", tsMissing, rustMissing);
  compare("replay missing journal state", JSON.parse(before), base);
  checked += 1;

  const nullBase = stateCopy(supportedBase);
  nullBase.journal = { base: null, entries: [] };
  const beforeNull = JSON.stringify(nullBase);
  const rustNull = JSON.parse(wasm.set_notes_replay(JSON.stringify(nullBase)));
  const tsNull = replay(nullBase.journal as never);
  compare("replay null base", tsNull, rustNull);
  compare("replay null base state", JSON.parse(beforeNull), nullBase);
  checked += 1;

  const malformedBase = stateCopy(supportedBase);
  malformedBase.journal = { base: "not-an-object", entries: [] } as never;
  const beforeMalformed = JSON.stringify(malformedBase);
  const rustMalformed = JSON.parse(wasm.set_notes_replay(JSON.stringify(malformedBase)));
  assert.equal(rustMalformed.errorCode, "journal-invalid");
  compare("replay malformed base state", JSON.parse(beforeMalformed), malformedBase);
  checked += 1;

  const unsupportedEntry = stateCopy(supportedBase);
  unsupportedEntry.journal = {
    base: stateCopy(supportedBase),
    entries: [
      {
        id: "legacy-entry",
        type: "startNight",
        payload: {},
        at: "2026-11-28T04:00:00.000Z",
        rulesetVersion: RULESET_VERSION,
        fingerprint: "x",
        undoable: true,
      },
    ],
  } as never;
  const beforeUnsupported = JSON.stringify(unsupportedEntry);
  const rustEntry = JSON.parse(wasm.set_notes_replay(JSON.stringify(unsupportedEntry)));
  assert.equal(rustEntry.errorCode, "journal-dependency");
  compare("unsupported replay entry state", JSON.parse(beforeUnsupported), unsupportedEntry);
  checked += 1;
}

// Legacy v4 envelope round-trips losslessly.
compare("legacy roundtrip", JSON.parse(LEGACY), JSON.parse(wasm.state_roundtrip(LEGACY)));
assert.equal(wasm.state_roundtrip(LEGACY), JSON.stringify(JSON.parse(LEGACY)));

assert.ok(checked >= CASES.cases.length, "every case was checked");
console.log(
  `setNotes differential passed: ${checked} checks${injectDivergence ? " with injected divergence detection" : ""}.`,
);
