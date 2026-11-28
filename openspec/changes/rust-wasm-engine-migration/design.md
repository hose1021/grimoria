# Design

ADR 0006 is the durable decision. This change records the Phase 0 slice.

## Boundary

`contracts/engine-boundary.json` version 2 inventories 123 callable engine
exports, 4 types, 22 read-model queries, 47 commands, 108 core error codes, 7
state queries, rule/preset queries and 4 projections. Tests derive those counts
from the live source files, so the inventory cannot drift silently. After
cutover, only the adapter may import the legacy TypeScript core for rule
computation.

## Ownership

Rust owns command validation, domain execution, effects, win, journal creation,
replay and projections. TypeScript keeps JSON parsing at the boundary,
undo/redo stack policy, the redo stack, legacy pre-v4 snapshots, persistence
transactions, storage errors and the offline/UI layers. The 108 core errors
split into 6 command-envelope, 2 journal/replay and 100 domain/invariant;
TypeScript lifecycle and persistence codes are separate.

## Contract

`apply_command` receives state, command and deterministic inputs and returns
`{result, state}`; state is unchanged for rejection and host choice. `preview`
returns only the result. Malformed input fails before mutation with
`engine-contract-violation`; lifecycle failures use `engine-init-failed` and
`engine-unavailable`. There is no silent fallback or mid-operation engine swap.

Serialization separates structural, canonical-byte and wire-byte equality.
ECMAScript UTF-16, integer-like key order, number formatting, absent/null and
ordered collections are explicit. Lone surrogates use a WTF-16 text type and
`\uXXXX` wire escapes, with committed test vectors.

## Workspace

Five crates with one allowed edge set; `scripts/check-cargo-graph.ts` rejects
extra edges, external workspace dependencies and cycles. Rust 1.98.1 and
`wasm32-unknown-unknown` are pinned; `Cargo.lock` is committed. Phase 0 crates
contain only identity/version constants and compile tests.

## Baseline

`scripts/engine-benchmark.ts` records command, replay (18 and 1,000 entries),
JSON overhead, export/import, clone, optional GC-controlled memory, bundle and
optional startup metrics. `docs/audits/engine-baseline.json` is the committed
baseline; budgets are in ADR 0006.

## Rollback

Revert this Phase 0 PR: the workspace, contracts and benchmark are additive and
unreferenced by production. No saved state or runtime path changes.
