## ADDED Requirements

### Requirement: The wire contract is versioned and schema-described

The wire boundary SHALL expose version `1` request and response DTOs with an
explicit operation enum. A request SHALL carry `wireVersion`, `operation` and
`payload`; a response SHALL carry `wireVersion` and `result`, plus `state` only
when the operation returns a state. An unknown version or operation SHALL be a
contract violation, not a fallback.

**Source**: Issue #535
**Tests**: `crates/grimoria-wire/src/dto.rs`, `scripts/wire-contract.test.ts`

#### Scenario: Unknown version

- **WHEN** a request carries `wireVersion: 2`
- **THEN** parsing fails with a contract violation and no state is returned

#### Scenario: Schema drift

- **WHEN** the schema and the Rust DTO disagree on the version or operation enum
- **THEN** the Node contract test fails

### Requirement: Canonical serialization matches ECMAScript

The wire crate SHALL parse strict JSON and emit wire and canonical forms.
Numbers SHALL use ECMAScript `Number#toString`, with negative zero as `0`.
Canonical object keys SHALL sort by UTF-16 code units; arrays SHALL preserve
order; absent fields SHALL stay omitted and explicit nulls SHALL persist.
Duplicate keys and non-finite numbers SHALL be rejected.

**Source**: Issue #535
**Tests**: `crates/grimoria-wire/src/json.rs`, `fixtures/conformance/wire-serialization.json`

#### Scenario: Integer-like keys

- **WHEN** the input object has keys `"1"`, `"10"` and `"2"`
- **THEN** the wire form keeps the host order and the canonical form sorts
  `"1" < "10" < "2"` by UTF-16 code units

#### Scenario: Number forms

- **WHEN** the input contains `1.0`, `1e21`, `1e-7`, `-0` and a large integer
- **THEN** each wire token equals the ECMAScript `JSON.stringify` result

#### Scenario: Absent and null

- **WHEN** an optional key is absent and another key is `null`
- **THEN** the absent key stays absent and the null key survives

### Requirement: WTF-16 preserves lone surrogates

Strings SHALL be represented as UTF-16 code units. Unpaired surrogates SHALL
round-trip as lowercase `\uxxxx` escapes, a well-formed pair SHALL serialize as
UTF-8, and hashing/comparison SHALL use code units. The committed vectors
SHALL cover `\uD800`, `\uDC00`, `a\uD800b`, a valid pair, `\u0000` and `café`.

**Source**: Issue #535
**Tests**: `crates/grimoria-wire/src/wtf16.rs`, `fixtures/conformance/wire-serialization.json`

#### Scenario: Lone high surrogate

- **WHEN** the input text contains `\uD800` with no low surrogate
- **THEN** the wire output preserves `\ud800` and no replacement character is
  written

#### Scenario: Valid surrogate pair

- **WHEN** the input contains `\uD83D\uDE00`
- **THEN** the output contains the UTF-8 emoji and not two escapes

### Requirement: Portable fixtures cover native and WASM

A committed fixture SHALL carry raw JSON inputs with expected wire and
canonical bytes. `grimoria-conformance` SHALL execute it natively, and
`grimoria-wasm` SHALL execute the same fixture through `wasm-bindgen-test`
under Node. A fixture edit SHALL fail parity in both runners.

**Source**: Issue #535
**Tests**: `crates/grimoria-conformance/tests/wire_fixture.rs`, `crates/grimoria-wasm/tests/wire.rs`

#### Scenario: Native mismatch

- **WHEN** native canonical bytes differ from the fixture
- **THEN** the native conformance test fails with the vector id

#### Scenario: WASM mismatch

- **WHEN** the WASM function returns different bytes for the same vector
- **THEN** the wasm-bindgen test fails

### Requirement: External Cargo dependencies are explicitly allowed

The workspace SHALL keep the acyclic crate matrix and add a per-crate external
allowlist. `grimoria-wire` MAY depend only on `ryu-js`; `grimoria-wasm` MAY
depend on `wasm-bindgen` and test-only `wasm-bindgen-test`; the other crates
SHALL use no external crate. Every other external package SHALL fail the graph
check. `Cargo.lock` SHALL be committed and resolution SHALL use `--locked
--offline`.

**Source**: Issue #535
**Tests**: `scripts/check-cargo-graph.test.ts`

#### Scenario: Allowed external crate

- **WHEN** `grimoria-wire` depends on `ryu-js`
- **THEN** the graph check accepts it

#### Scenario: Unlisted external crate

- **WHEN** `grimoria-conformance` depends on any external crate
- **THEN** the graph check fails

### Requirement: No production cutover

Phase 1 SHALL NOT import a Rust crate from production TypeScript, load a WASM
asset, change `pg.game.v4`, add gameplay or migrate a role. The TypeScript
engine SHALL remain the sole production engine.

**Source**: Issue #535
**Tests**: `scripts/engine-boundary.test.ts`, `scripts/wire-contract.test.ts`

#### Scenario: Production import

- **WHEN** a production module imports `grimoria-wire` or requests a WASM asset
- **THEN** the boundary and production-import checks fail

#### Scenario: Saved state

- **WHEN** a `pg.game.v4` save is loaded after Phase 1
- **THEN** the TypeScript engine reads it exactly as before
