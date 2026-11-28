# Design

## Scope boundary

`grimoria-wire` is a pure serialization crate. It contains no game rules and no
state model beyond the opaque canonical value. `grimoria-wasm` exports only the
wire functions; `grimoria-conformance` reads the same fixtures natively. The
TypeScript engine stays the sole production engine.

## Versioned DTOs

`WIRE_VERSION` is `1`, matching `contracts/engine-boundary.json`. A request is
`{ "wireVersion": 1, "operation": <enum>, "payload": <value> }`. A response is
`{ "wireVersion": 1, "result": <value>, "state"?: <value> }`; `state` is
present only for an operation that returns a state. Unknown versions and
operations are contract violations, not fallbacks.

The JSON Schemas in `contracts/wire/` are the language-neutral description.
The Rust DTO parser is the executable check. A schema test in Node asserts the
same version, operation enum and required fields, so neither side drifts alone.

## Canonical value

One `Value` enum holds null, boolean, number, WTF-16 string, array and object.
Objects are an ordered list of key/value pairs, so both wire order and canonical
order are representable without a hash map. Duplicate keys are rejected at
parse time.

Three forms exist:

- **structural**: the parsed `Value` tree, including absent-vs-null.
- **wire**: the input order and ECMAScript `JSON.stringify` bytes.
- **canonical**: UTF-16 sorted object keys, arrays preserved, absent keys
  omitted, explicit nulls kept, ECMAScript number and string encoding.

The wire form enumerates canonical array-index keys first in ascending numeric
order, then the remaining keys in stored order, matching ECMAScript
`JSON.stringify`. The comparison-only canonical form, version
`grimoria-canonical-v1`, sorts all keys by UTF-16 code units, which deliberately
differs from ECMAScript's integer-first enumeration; the fixture records both
orders.

Legacy compatibility is a separate encoding,
`grimoria-legacy-canonical-v0.14.0`. It reproduces the TypeScript
`canonicalize` plus `JSON.stringify`: recursively sort keys by UTF-16, then let
ECMAScript object enumeration put canonical array-index keys first in ascending
numeric order. This is used only for fingerprints, seeds and persisted
identities; the TypeScript oracle is unchanged.

## ECMAScript compatibility

- Numbers parse only from strict JSON grammar into `f64`. Non-finite values and
  overflow are rejected. `ryu-js` formats finite numbers with ECMAScript
  `Number#toString`; negative zero prints `0`.
- Strings are `Wtf16`, a vector of UTF-16 code units. Raw UTF-8 is decoded to
  code units; `\uXXXX` escapes are decoded to code units.
- `JSON.stringify` escapes `"`, `\`, the five control short forms and other
  code units below `0x20` as lowercase `\u00xx`. A well-formed surrogate pair is
  emitted as UTF-8; an unpaired surrogate stays as lowercase `\uxxxx`.
- Integer-like keys keep the host order in the wire form. Canonical sorting uses
  the full UTF-16 code-unit sequence, so `"10"` sorts before `"2"`.
- The legacy encoding also drops a `__proto__` key, matching the v0.14.0
  TypeScript object assignment; the other encodings keep it.
- An absent optional field is omitted; an explicit null remains.
- Arrays preserve order in every form.

## Failures and limits

A failure is a JSON object with code `engine-contract-violation`, a stable
`kind` (`syntax`, `duplicate-key`, `non-finite-number`, `limit` or `contract`),
a human message and an offset or limit where available. WASM returns that JSON
as the error value; callers do not parse exception prose. Limits default to
16 MiB input, depth 256, 100,000 collection entries and 1,000,000 nodes.
Duplicate keys use a hash set rather than a linear scan.

## Operation inventory

Only `canonical_bytes` is implemented. `apply_command`, `prepare_command`,
`preview_command`, `validate_command`, `replay`, `import_save`, `export_save`,
`query`, `public_projection`, `player_projection` and `canonical_state` are
reserved; `canonical_state` waits for exact TypeScript `canonicalState`
semantics. Every name outside the enum is unavailable and fails with a contract
violation. Each operation names an approved `contracts/engine-boundary.json`
section.

## Fixtures and parity

`fixtures/conformance/wire-serialization.json` holds raw JSON inputs with the
expected wire and comparison canonical bytes. The native conformance runner
reads it from the repository. The WASM `wasm-bindgen-test` calls the exported
functions on the same inputs and compares the same expected strings. A mismatch
fails the respective test; the fixture is committed and immutable within the
phase.

`fixtures/conformance/wire-legacy-vectors.json` holds the v0.14.0 TypeScript
canonical vectors, including numeric-key, index-boundary, nested and lone
surrogate cases. `scripts/wire-differential.test.ts` compares the wire fixture
with `JSON.stringify`, the legacy fixture with the real TypeScript
`canonicalize`, persisted fingerprints and portable identities.
`scripts/wire-wasm-parity.ts` executes the generated Node WASM bindings and
compares all three encodings through the JavaScript boundary.

## Dependencies and locked builds

The graph check keeps the workspace edge matrix and adds a per-crate direct
allowlist: `grimoria-wire` may use `ryu-js`; `grimoria-wasm` may use
`wasm-bindgen` and its test-only `wasm-bindgen-test`; `grimoria-domain`,
`grimoria-conformance` and `grimoria-cli` use no external crate. Every resolved
direct and transitive package must match an approved name, version and crates.io
source, with a matching lock checksum. Path dependencies outside the workspace,
git sources, `[patch]`/`[replace]` sections and source replacements fail.
`Cargo.lock` is committed and `cargo metadata --locked --offline` is the gate.

## WASM test execution

`grimoria-wasm` exports `wire_version`, `wire_canonical_bytes` and
`wire_bytes`. `wasm-bindgen-test` runs the fixture parity test under Node with
the pinned runner. CI installs the exact runner version from `Cargo.lock`, so
the test executes instead of only compiling.
