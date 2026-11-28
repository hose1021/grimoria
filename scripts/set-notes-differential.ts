import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { prepareCommand } from "../src/core/commands/prepare.ts";
import { applyCommand, previewCommand } from "../src/core/engine/commands.ts";
import { replay } from "../src/core/engine/replay.ts";
import {
  RULESET_VERSION,
  SUPPORTED_RULESET_VERSIONS,
} from "../src/core/engine/command-versions.ts";
import type { GameState } from "../src/core/model/types.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const moduleIndex = args.indexOf("--module");
const modulePath = moduleIndex >= 0 ? args[moduleIndex + 1] : null;
const injectDivergence = args.includes("--inject-divergence");
assert.ok(modulePath, "usage: node scripts/set-notes-differential.ts --module <generated.js>");
const generated = resolve(modulePath);
writeFileSync(join(dirname(generated), "package.json"), '{"type":"commonjs"}\n');
const wasm = createRequire(import.meta.url)(generated) as {
  set_notes_validate: (state: string, command: string, inputs: string) => string;
  set_notes_preview: (state: string, command: string, inputs: string) => string;
  set_notes_apply: (state: string, command: string, inputs: string) => string;
  set_notes_replay: (state: string) => string;
};

const CASES = JSON.parse(
  readFileSync(join(ROOT, "fixtures/conformance/set-notes-cases.json"), "utf8"),
) as {
  cases: {
    id: string;
    command: Record<string, unknown>;
    inputs: { timestamp: string; seed: string; id: string };
  }[];
};
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

function prepare(caseFile: (typeof CASES.cases)[number]) {
  return prepareCommand(caseFile.command as never, ports(caseFile.inputs));
}

function stateCopy(state: unknown): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function compare(label: string, expected: unknown, actual: unknown) {
  assert.deepStrictEqual(actual, expected, label);
  if (typeof expected === "object" && expected !== null && !Array.isArray(expected)) {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) {
      let index = 0;
      while (index < left.length && index < right.length && left[index] === right[index])
        index += 1;
      throw new Error(
        `${label} wire order differs at ${index}: actual ${left.slice(index, index + 120)} expected ${right.slice(index, index + 120)}`,
      );
    }
  }
}

let checked = 0;
for (const caseFile of CASES.cases) {
  const base = stateCopy(JSON.parse(LEGACY));
  const prepared = prepare(caseFile);
  if (!prepared.ok) {
    const rust = JSON.parse(
      wasm.set_notes_apply(
        JSON.stringify(base),
        JSON.stringify(caseFile.command),
        JSON.stringify(caseFile.inputs),
      ),
    ) as { result?: { errorCode?: string }; errorCode?: string };
    assert.equal(rust.result?.errorCode ?? rust.errorCode, prepared.errorCode, caseFile.id);
    checked += 1;
    continue;
  }
  if (caseFile.id === "unsupported-command") {
    const rust = JSON.parse(
      wasm.set_notes_apply(
        JSON.stringify(base),
        JSON.stringify(caseFile.command),
        JSON.stringify(caseFile.inputs),
      ),
    ) as { result: { status: string; errorCode: string } };
    assert.equal(rust.result.status, "rejected", caseFile.id);
    assert.equal(rust.result.errorCode, "command-unknown", caseFile.id);
    checked += 1;
    continue;
  }

  const tsState = stateCopy(base);
  const tsResult = applyCommand(tsState, prepared.command);
  const rust = JSON.parse(
    wasm.set_notes_apply(
      JSON.stringify(base),
      JSON.stringify(caseFile.command),
      JSON.stringify(caseFile.inputs),
    ),
  ) as { result: unknown; state: Record<string, unknown> };
  compare(`${caseFile.id}: result`, tsResult, rust.result);
  compare(`${caseFile.id}: state`, tsState, rust.state);

  const previewBase = stateCopy(base);
  const tsPreview = previewCommand(previewBase, prepared.command);
  const rustPreview = JSON.parse(
    wasm.set_notes_preview(
      JSON.stringify(base),
      JSON.stringify(caseFile.command),
      JSON.stringify(caseFile.inputs),
    ),
  );
  compare(`${caseFile.id}: preview`, tsPreview, rustPreview);
  compare(`${caseFile.id}: preview state`, base, previewBase);

  const replaySeed = stateCopy(base);
  replaySeed.journal = { base: null, entries: [] };
  replaySeed.applied = {};
  const replayCommand = applyCommand(stateCopy(replaySeed), prepared.command);
  assert.equal(replayCommand.status, "allowed", `${caseFile.id}: replay setup`);
  const replayState = stateCopy(replaySeed);
  applyCommand(replayState, prepared.command);
  const replayTs = replay(replayState.journal as never);
  assert.equal(replayTs.ok, true, `${caseFile.id}: TypeScript replay`);
  const rustReplayState = JSON.parse(
    wasm.set_notes_apply(
      JSON.stringify(replaySeed),
      JSON.stringify(caseFile.command),
      JSON.stringify(caseFile.inputs),
    ),
  ) as { state: Record<string, unknown> };
  const replayRust = JSON.parse(wasm.set_notes_replay(JSON.stringify(rustReplayState.state)));
  assert.equal(replayRust.ok, true, `${caseFile.id}: Rust replay ${JSON.stringify(replayRust)}`);
  compare(`${caseFile.id}: replay state`, replayTs.state, replayRust.state);

  const duplicateTs = applyCommand(tsState, prepared.command);
  const duplicateRust = JSON.parse(
    wasm.set_notes_apply(
      JSON.stringify(rust.state),
      JSON.stringify(caseFile.command),
      JSON.stringify(caseFile.inputs),
    ),
  ) as { result: unknown };
  compare(`${caseFile.id}: idempotent`, duplicateTs, duplicateRust.result);

  const conflict = {
    ...prepared.command,
    payload: { notes: "different" },
  };
  const conflictTs = applyCommand(tsState, conflict as never);
  const conflictRust = JSON.parse(
    wasm.set_notes_apply(
      JSON.stringify(rust.state),
      JSON.stringify(conflict),
      JSON.stringify(caseFile.inputs),
    ),
  ) as { result: unknown };
  compare(`${caseFile.id}: conflict`, conflictTs, conflictRust.result);

  if (injectDivergence) {
    const injected = JSON.parse(JSON.stringify(rust.result)) as Record<string, unknown>;
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

assert.ok(checked >= CASES.cases.length, "every case was checked");
console.log(
  `setNotes differential passed: ${checked} cases${injectDivergence ? " with injected divergence detection" : ""}.`,
);
