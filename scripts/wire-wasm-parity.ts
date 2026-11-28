import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { canonicalize } from "../src/core/engine/command-state.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const argumentsList = process.argv.slice(2);
const moduleIndex = argumentsList.indexOf("--module");
const modulePath = moduleIndex >= 0 ? argumentsList[moduleIndex + 1] : null;
assert.ok(modulePath, "usage: node scripts/wire-wasm-parity.ts --module <generated.js>");

const generated = resolve(modulePath);
writeFileSync(join(dirname(generated), "package.json"), '{"type":"commonjs"}\n');
const require = createRequire(import.meta.url);
const wasm = require(generated) as {
  wire_version: () => number;
  wire_bytes: (input: string) => string;
  wire_canonical_bytes: (input: string) => string;
  wire_legacy_canonical_bytes: (input: string) => string;
};

const WIRE = JSON.parse(
  readFileSync(resolve(ROOT, "fixtures/conformance/wire-serialization.json"), "utf8"),
) as { vectors: { id: string; input: string; wire: string; canonical: string }[] };
const LEGACY = JSON.parse(
  readFileSync(resolve(ROOT, "fixtures/conformance/wire-legacy-vectors.json"), "utf8"),
) as { vectors: { id: string; input: string; expected: string }[] };

assert.equal(wasm.wire_version(), 1);

for (const vector of WIRE.vectors) {
  assert.equal(JSON.stringify(JSON.parse(vector.input)), vector.wire, vector.id);
  assert.equal(wasm.wire_canonical_bytes(vector.input), vector.canonical, vector.id);
  assert.equal(
    wasm.wire_legacy_canonical_bytes(vector.input),
    JSON.stringify(canonicalize(JSON.parse(vector.input))),
    vector.id,
  );
  const request = `{"wireVersion":1,"operation":"apply_command","payload":${vector.input}}`;
  const expected = `{"wireVersion":1,"operation":"apply_command","payload":${vector.wire}}`;
  assert.equal(wasm.wire_bytes(request), expected, vector.id);
}

for (const vector of LEGACY.vectors) {
  assert.equal(
    wasm.wire_legacy_canonical_bytes(vector.input),
    JSON.stringify(canonicalize(JSON.parse(vector.input))),
    vector.id,
  );
  assert.equal(wasm.wire_legacy_canonical_bytes(vector.input), vector.expected, vector.id);
}

let failure: unknown;
try {
  wasm.wire_bytes('{"wireVersion":2,"operation":"apply_command","payload":null}');
} catch (error) {
  failure = error;
}
assert.ok(failure, "an unknown version throws");
const structured = JSON.parse(String(failure)) as { code: string; kind: string };
assert.equal(structured.code, "engine-contract-violation");
assert.equal(structured.kind, "contract");

let limited: unknown;
try {
  wasm.wire_canonical_bytes(`${"[".repeat(300)}0${"]".repeat(300)}`);
} catch (error) {
  limited = error;
}
assert.ok(limited, "a depth limit throws");
const limit = JSON.parse(String(limited)) as { kind: string; limitKind: string; max: number };
assert.equal(limit.kind, "limit");
assert.equal(limit.limitKind, "depth");
assert.equal(limit.max, 256);

console.log(
  `WASM parity passed: ${WIRE.vectors.length} wire vectors, ${LEGACY.vectors.length} legacy vectors.`,
);
