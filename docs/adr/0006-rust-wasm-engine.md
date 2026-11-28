# ADR 0006: Rust/WASM engine migration with a TypeScript reference oracle

- Status: Proposed (Phase 0 and 1 complete; Phase 2 `setNotes` slice implemented)
- Date: 2026-11-28
- Issue: [#535](https://github.com/hose1021/grimoria/issues/535)
- Baseline: tag `v0.14.0`, `main` `de6a17a8997f1dfa22ebbc50a36b4bd57640ad7c`
- Extends: [ADR 0005](0005-runtime-boundaries.md)

## Context

The TypeScript engine owns all 72 roles, 172 rule IDs, 47 commands, 108 core
error codes, 15 historical rulesets and the `pg.game.v4` state contract. A Rust
core compiled to WebAssembly is the intended replacement after a separately
approved migration. The browser UI, storage, localization, PWA and import/export
orchestration stay TypeScript.

## Decision

1. TypeScript remains the sole production engine until a separate cutover
   change is approved. Phase 0 adds contracts and an empty Cargo workspace only.
2. The Rust core is a deterministic library with no clock, RNG, storage, DOM,
   network or ambient state. It receives explicit inputs and returns explicit
   outputs.
3. The only Rust boundary is a versioned JSON contract. Phase 0 fixes the
   version and the surface; it does not implement gameplay.
4. One engine runs an operation. Dual-run comparison exists outside production;
   there is never a silent fallback or merged result.
5. TypeScript is a compatibility oracle, not proof of official rules. Pinned
   sources and independent tests remain the semantic authority.
6. Cutover requires parity, performance, privacy, offline and rollback evidence,
   plus owner approval.

## Engine boundary and ownership

`contracts/engine-boundary.json` version 2 is the inventory: 123 callable engine
exports, 4 exported types, 22 read-model queries, 47 commands, 108 error codes,
7 state queries, rule/preset queries and 4 projections. After cutover no
production file outside the adapter may import the legacy TypeScript core for
rule computation; a future architecture check enforces the import graph.

| Concern | Owner |
| --- | --- |
| Command envelope validation, domain execution, effects, win, journal creation, replay, projections | Rust |
| JSON parsing at the boundary, undo/redo stack policy, redo stack, legacy pre-v4 snapshot | TypeScript store |
| Persistence transaction, backup, atomic write, storage and lifecycle errors | TypeScript |
| UI, localization, routing, offline/PWA | TypeScript |

Core error layers: 6 command-envelope, 2 journal/replay, 100 domain/invariant.
TypeScript adds `persist-failed`, `nothing-to-undo`, `nothing-to-redo`,
storage/read errors and the engine lifecycle codes; the adapter maps them, it
does not invent Rust codes.

## Wire contract

Transport is JSON strings over `wasm-bindgen`; no shared mutable memory.

- `apply_command(state_json, command_json, inputs_json)` returns
  `{"result": CommandResult, "state": GameState}`. `state` is always the full
  post-operation state: unchanged for `rejected` and
  `requires-storyteller-choice`, and the committed draft for `allowed`.
  The TypeScript adapter persists only an `allowed` result.
- `preview_command` returns only `CommandResult`; it never exposes a draft.
- `validate_command` returns a validation result; `replay` returns a replay
  result with the rebuilt state; `import_save`/`export_save` own the v4 envelope;
  `canonical_state` and `canonical_bytes` produce comparison forms.
- `inputs_json` carries the captured timestamp and seed/ID material. The host
  supplies the ID suffix in the first cut; Rust minting starts only after
  byte-parity vectors.
- Query surface: all 123 engine callables, 7 state queries, 22 read-model
  queries, rule/preset queries and 4 projections listed in
  `contracts/engine-boundary.json`.

Malformed input and lifecycle boundaries:

- Invalid JSON/UTF-8, oversized input or an unknown contract version returns
  `engine-contract-violation` before mutation.
- Malformed command envelopes return the existing `command-*` codes.
- `engine-init-failed` (load/hash/timeout), `engine-unavailable` (not ready or
  failed) and `engine-contract-violation` are TypeScript lifecycle errors. A
  failed operation leaves saved state unchanged and surfaces the error.
- No silent fallback: after cutover a WASM failure never retries on TypeScript,
  never swaps engines mid-operation and never writes a partial result.

Initialization: `idle → loading → ready | failed`. One load per page, 5 s
timeout, asset hash/version check. Offline serves the hashed asset; a missing or
corrupt asset fails explicitly.

## Serialization

- **Structural equality** checks field presence, absent-vs-null, types and order.
- **Canonical byte equality** uses sorted UTF-16 keys, preserved arrays, omitted
  absent fields, explicit nulls and ECMAScript number/string encoding.
- **Wire byte equality** requires the exact `JSON.stringify` bytes at the
  boundary, including field order.

ECMAScript rules: strings are UTF-16 code units; integer-like keys enumerate
first in ascending numeric order; numbers use `Number#toString`; absent fields
are omitted; explicit nulls persist; ordered collections keep order.

Lone surrogates: wire text is preserved as UTF-16 code units. Rust uses an
explicit WTF-16 string type for text fields, hashes over `encode_utf16`, and
serializes unpaired surrogates as `\uXXXX` escapes. Vectors:
`\uD800`, `\uDC00`, `a\uD800b`, `\uD800\uDC00`, `\uD83D\uDE00`, `\u0000`,
`café`.

## Phase 1 wire implementation

`grimoria-wire` owns the executable contract: `WIRE_VERSION = 1`, request and
response DTOs, a strict JSON parser, `Wtf16`, and wire/canonical serializers.
The comparison encoding is `grimoria-canonical-v1`; legacy fingerprints use
the separate `grimoria-legacy-canonical-v0.14.0`, which reproduces the v0.14.0
TypeScript canonicalize plus `JSON.stringify`, including numeric-first array
indexes. `ryu-js` supplies ECMAScript number formatting.

Failures are JSON with code `engine-contract-violation`, a stable category, an
optional offset and a `limitKind` for bounded failures. Input bytes, depth,
collection entries and nodes are bounded; duplicate keys use a hash set.
Wire objects enumerate canonical array-index keys first in ascending numeric
order, then the remaining keys in stored order, matching `JSON.stringify`.

Operations carry an explicit implemented, reserved or unavailable status.
`canonical_bytes` is implemented. `apply_command`, `prepare_command`,
`preview_command`, `validate_command`, `replay`, `import_save`, `export_save`,
`query`, `public_projection`, `player_projection` and `canonical_state` are
reserved; `canonical_state` waits for exact TypeScript `canonicalState`
semantics.

`scripts/check-cargo-graph.ts` checks the full resolved graph: approved
name/version/crates.io source for every direct and transitive package, lock
checksum equality, no path or git substitution, no patch/replace and no source
replacement. `Cargo.lock` is committed and every check uses `--locked
--offline`.

The committed fixtures run natively in `grimoria-conformance` and through
`wasm-bindgen-test` in Node. `scripts/wire-differential.test.ts` compares them
with ECMAScript and the real TypeScript canonicalizer, and
`scripts/wire-wasm-parity.ts` executes the generated Node bindings. The wasm32
CI job installs `wasm-bindgen-cli` at the lockfile version and runs both.

## Phase 2 setNotes vertical slice

`grimoria-wire` is pure serialization; `grimoria-domain` now depends on it.
`State` wraps the parsed JSON object and edits only `notes`, `applied` and
`journal`, preserving every unknown field and UTF-16 code unit. Preparation
accepts host-supplied timestamp, seed and id, validates the envelope and
computes the legacy fingerprint and identity.

`setNotes` validate, preview, apply and replay match the TypeScript result,
state, events, applied identity, journal coalescing, idempotency and conflict
behavior. Rejections do not mutate state. Unsupported commands fail explicitly.
The slice accepts only states without impairing or Pukka effects whose
invariants pass; other semantics return `unsupported-state`. Supplied timestamps
stay in the prepare result and normalize to canonical UTC for execution.
Replay is limited to `setNotes` entries; a malformed base is `journal-invalid`
and an unsupported entry is `journal-dependency`.

`fixtures/conformance/set-notes-cases.json` and
`scripts/set-notes-differential.ts` run the real TypeScript engine and the
generated Node WASM bindings over the committed legacy state. The comparison
covers prepare/validate/preview/apply, complete rejections and unchanged state,
Unicode, lone-surrogate ids, numeric ids, offsets, milliseconds, absent/null
payloads, malformed and invalid commands, duplicate ids, sequential coalescing,
preview isolation, replay state and events, every runtime ruleset and the
legacy v4 round-trip. Mismatch diagnostics contain field paths and digests only.
The `--inject-divergence` mode proves the comparator detects a changed field.

## Oracle versioning

1. Immutable compatibility oracle: v0.14.0 `de6a17a`, frozen source/bundle and
   fixture digests.
2. Live TypeScript oracle: current `dev`; intentional changes require an
   oracle-version record, both-engine update and source-derived expectation.
3. Independent semantic evidence: pinned official revisions and independent
   tests; never generated from either engine.
4. No silent re-baselining or count-only comparison. Historical rulesets keep
   old behaviour for old journals.

## Differential testing

Portable fixtures run natively in Rust and through TS-vs-WASM in Node; generated
streams cover legal/invalid commands, host choices, impairment, role changes,
undo/redo and save/reload. A single divergence fails with digests, not state
bodies. Browser dual-run stays behind a flag. Diagnostics contain command
id/type, versions, rule id, error code, field path and digests only; no states,
names, roles, notes or secrets.

## Cargo workspace and dependency direction

```text
grimoria-cli        -> grimoria-conformance
grimoria-conformance-> grimoria-domain, grimoria-wire
grimoria-wasm       -> grimoria-domain, grimoria-wire
grimoria-domain     -> grimoria-wire
grimoria-wire       -> (no workspace crate)
```

`scripts/check-cargo-graph.ts` reads the full resolved Cargo metadata (`--locked
--offline`) and rejects extra or missing workspace packages, unapproved external
packages, an unauthorized edge and a dependency cycle. It checks the resolved
edges, so target-specific, dev, build, optional, renamed and workspace-inherited
declarations cannot hide a dependency. It runs in `npm run
verify` and CI. `rust-toolchain.toml` pins Rust 1.98.1 and
`wasm32-unknown-unknown`; `Cargo.lock` is committed. No `rand`, `chrono`,
`getrandom`, storage or network crates in the domain.

## Benchmark methodology and budgets

`scripts/engine-benchmark.ts` (Node 26, fixed iterations and warm-up) measures
apply, preview and idempotent-reuse paths on separate workloads. Warm-up and
measured command identities and states are disjoint; every measured apply is
asserted `allowed` with `idempotent: false`; reuse is asserted `allowed` with
`idempotent: true`. It also records replay of the 18-entry legacy journal and a
synthetic 1,000-entry `setNotes` journal, JSON.stringify/parse overhead,
export/import, clone, optional retained memory (`--expose-gc`), built JS bundle
gzip/brotli and optional Playwright startup. The run records CPU, Node, rustc
and cargo versions, the fixture SHA-256, state size (160,153 B), player count
and schema version. The committed baseline is
`docs/audits/engine-baseline.json`.

Corrected Phase 0 baseline (Apple M4 Pro, Node v26.8.2, Rust 1.98.1; medians /
p95 in ms):

| Metric | Baseline | Budget |
| --- | ---: | ---: |
| apply setNotes | 0.514 / 0.836 | ≤ 1.50 p95 |
| preview setNotes | 0.070 / 0.077 | ≤ 0.15 p95 |
| idempotent reuse | 0.004 / 0.004 | ≤ 0.02 p95 |
| JSON.stringify state | 0.148 / 0.157 | ≤ 0.30 p95 |
| export / import | 0.327 / 0.743 | ≤ 0.70 / 1.50 p95 |
| 18-entry replay | 4.55 / 4.94 | ≤ 6.0 p95 |
| 1,000-entry replay | 868 / 926 | ≤ 1,200 p95; ≤ 1.2 ms/entry |
| startup ready / first paint | 115 / 153; 80 | ≤ 250 p95 / ≤ 100 |
| JS bundle | 285 KB brotli | WASM ≤ 250 KB; total ≤ 550 KB |
| retained memory | 13.87 MB / 100 states | ≤ 1.5× baseline; WASM ≤ 16 MB |

A divergence outside a budget blocks cutover. Idempotent reuse is measured
separately and is not part of the apply latency.

## Consequences

Two engines exist during migration. Every change must pass differential parity
and the existing gates. Bundle size, cold load and offline behaviour become
release budgets. TypeScript is removable only after an approved cutover, a
retained rollback tag and demonstrated equivalence.

## Phase 0 scope

This ADR is implemented in Phase 0 by an empty five-crate workspace, the
versioned boundary inventory, the graph check, the benchmark harness/baseline
and CI jobs. It adds no Rust gameplay, no WASM loading in production, no adapter
change and no role migration.
