## ADDED Requirements

### Requirement: Phase 0 changes no runtime engine

The Phase 0 workspace and contracts SHALL NOT change the production engine,
storage, UI or saved-state contract. TypeScript SHALL remain the sole production
engine, and no production bundle SHALL load a WASM engine.

**Source**: Issue #535
**Tests**: `scripts/engine-boundary.test.ts`, `scripts/check-cargo-graph.test.ts`

#### Scenario: Production import graph

- **WHEN** Phase 0 is merged
- **THEN** no production module imports a Cargo crate and no WASM asset is
  requested by the application

#### Scenario: Saved state

- **WHEN** a `pg.game.v4` save is loaded after Phase 0
- **THEN** the TypeScript engine reads it exactly as before

### Requirement: The engine boundary is complete and machine-checked

`contracts/engine-boundary.json` SHALL inventory every callable engine export,
state query, read-model query, command, error code, historical ruleset and
projection needed by production. Tests SHALL derive the counts from the live
sources. After cutover, only the adapter MAY import the legacy TypeScript core
for rule computation.

**Source**: Issue #535
**Tests**: `scripts/engine-boundary.test.ts`

#### Scenario: Inventory drift

- **WHEN** a command, engine export or read-model query is added without the
  boundary
- **THEN** the boundary test fails

### Requirement: Command execution has explicit state input and output

`apply_command` SHALL receive a full state, command and deterministic inputs and
return `{result, state}`. The returned state SHALL be unchanged for `rejected`
and `requires-storyteller-choice`, and the committed draft for `allowed`.
`preview_command` SHALL return no state. TypeScript SHALL persist only an
`allowed` result.

**Source**: Issue #535
**Tests**: `scripts/engine-boundary.test.ts`

#### Scenario: Rejected command

- **WHEN** a command is rejected
- **THEN** the returned state equals the input state and no storage write occurs

#### Scenario: Preview isolation

- **WHEN** preview runs
- **THEN** no resulting state is exposed and the input is unchanged

### Requirement: Malformed input and engine lifecycle errors are explicit

Invalid JSON, invalid UTF-8, an unknown contract version or an oversized input
SHALL fail with `engine-contract-violation` before mutation. A failed
initialization SHALL use `engine-init-failed`; an operation before readiness or
after failure SHALL use `engine-unavailable`. No operation SHALL silently fall
back to another engine or write a partial result.

**Source**: Issue #535
**Tests**: `scripts/engine-boundary.test.ts`

#### Scenario: Malformed JSON

- **WHEN** the boundary receives malformed JSON
- **THEN** it returns `engine-contract-violation` and the saved state is unchanged

#### Scenario: Late WASM failure

- **WHEN** the engine fails after a command starts
- **THEN** no fallback runs, no partial state is saved and the error is surfaced

### Requirement: Serialization equality and lone surrogates are defined

The contract SHALL distinguish structural, canonical-byte and wire-byte
equality. It SHALL define ECMAScript UTF-16 code units, integer-like key order,
number formatting, absent-versus-null and ordered collections. Lone surrogates
SHALL be preserved as UTF-16 code units with `\uXXXX` wire escapes and committed
test vectors.

**Source**: Issue #535
**Tests**: `scripts/engine-boundary.test.ts`

#### Scenario: Unpaired surrogate

- **WHEN** text contains `\uD800` alone
- **THEN** the wire form preserves it and hashing uses one UTF-16 code unit

#### Scenario: Numeric object keys

- **WHEN** player ids `"1"` and `"10"` are serialized
- **THEN** key order follows ECMAScript integer-key order, not insertion order

### Requirement: Cargo dependencies follow one acyclic matrix

The workspace SHALL allow only `cli → conformance`, `conformance → domain,
wire`, `wasm → domain, wire`, `wire → domain`; every other edge, external
workspace dependency and cycle SHALL fail the graph check in verify and CI.

**Source**: Issue #535
**Tests**: `scripts/check-cargo-graph.test.ts`

#### Scenario: Extra edge

- **WHEN** `grimoria-domain` depends on `grimoria-wire`
- **THEN** the graph check fails

#### Scenario: Cycle

- **WHEN** two crates depend on each other
- **THEN** the graph check reports the cycle

### Requirement: The TypeScript baseline and budgets are reproducible

A committed harness SHALL measure command latency, preview, export/import,
JSON serialization overhead, small and 1,000-entry replay, clone, optional
GC-controlled memory, bundled size and optional startup. The committed baseline
SHALL record environment and iterations; budgets SHALL be expressed in ADR 0006.

**Source**: Issue #535
**Tests**: `docs/audits/engine-baseline.json`, `scripts/engine-benchmark.ts`

#### Scenario: Large journal

- **WHEN** the harness replays a synthetic 1,000-entry journal
- **THEN** it records total and per-entry latency in the baseline

#### Scenario: JSON overhead

- **WHEN** the harness measures `JSON.stringify` and its round trip
- **THEN** those values are separate from command latency

### Requirement: Oracle and diagnostics roles are fixed

The immutable v0.14.0 TypeScript oracle, the live TypeScript oracle and
independent official-source evidence SHALL remain separate. Differential
diagnostics SHALL contain identifiers, versions, error codes, field paths and
digests only; no game state, names, roles, notes or secrets.

**Source**: Issue #535
**Tests**: `docs/adr/0006-rust-wasm-engine.md`, `contracts/engine-boundary.json`

#### Scenario: Intentional behaviour change

- **WHEN** a rule behaviour changes during migration
- **THEN** it needs a separate issue, pinned source, RED/GREEN, both-engine update
  and an oracle-version record

#### Scenario: Diagnostic artifact

- **WHEN** a differential run fails in CI
- **THEN** the uploaded artifact contains no state body or secret
