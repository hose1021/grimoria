# ADR 0006: Rust/WASM engine migration with a TypeScript reference oracle

- Status: Proposed (Phase 0 scaffolding only)
- Date: 2026-11-28
- Issue: [#535](https://github.com/hose1021/grimoria/issues/535)
- Baseline: tag `v0.14.0`, `main` `de6a17a8997f1dfa22ebbc50a36b4bd57640ad7c`
- Extends: [ADR 0005](0005-runtime-boundaries.md)

## Context

The TypeScript engine owns all 72 roles, 172 rule IDs, 47 commands, 108 core
error codes, 14 historical rulesets and the `pg.game.v4` state contract. A Rust
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
grimoria-wire       -> grimoria-domain
grimoria-domain     -> (no workspace crate)
```

`scripts/check-cargo-graph.ts` parses the manifests, rejects extra edges,
non-workspace dependencies and cycles, and runs in `npm run verify` and CI.
`rust-toolchain.toml` pins Rust 1.98.1 and `wasm32-unknown-unknown`;
`Cargo.lock` is committed. No `rand`, `chrono`, `getrandom`, storage or network
crates in the domain.

## Benchmark methodology and budgets

`scripts/engine-benchmark.ts` (Node 26, fixed iterations and warm-up) records
command latency, replay of the 18-entry legacy journal and a synthetic
1,000-entry `setNotes` journal, JSON.stringify/parse overhead, export/import,
clone, optional retained memory (`--expose-gc`), built JS bundle gzip/brotli and
optional Playwright startup. The committed baseline is
`docs/audits/engine-baseline.json`.

Budgets after the same harness: apply p95 ≤ 1.50 ms; preview ≤ 0.15 ms; export
≤ 0.70 ms; import ≤ 1.50 ms; 18-entry replay ≤ 6 ms; 1,000-entry replay p95
≤ 1,200 ms (≤ 1.2 ms/entry); startup ready p95 ≤ 250 ms; first paint ≤ 100 ms;
WASM engine ≤ 250 KB brotli and initial JS+WASM ≤ 550 KB brotli; retained state
memory ≤ 1.5× the TypeScript baseline (`13.86 MB` per 100 imported states on
the Phase 0 run) and WASM linear memory ≤ 16 MB for 15 players.

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
