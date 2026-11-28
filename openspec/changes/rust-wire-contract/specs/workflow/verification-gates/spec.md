## ADDED Requirements

### Requirement: The wire contract is versioned and schema-described

The wire boundary SHALL expose version `1` request and response DTOs with an
explicit operation enum. A request SHALL carry `wireVersion`, `operation` and
`payload`; a response SHALL carry `wireVersion` and `result`, plus `state` only
when the operation returns a state. Every approved operation SHALL carry an
explicit status: implemented, reserved or unavailable. An unknown version or
operation SHALL be a contract violation, not a fallback.

**Source**: Issue #535
**Tests**: `crates/grimoria-wire/src/dto.rs`, `scripts/wire-contract.test.ts`

#### Scenario: Unknown version

- **WHEN** a request carries `wireVersion: 2`
- **THEN** parsing fails with a contract violation and no state is returned

#### Scenario: Schema drift

- **WHEN** the schema and the Rust DTO disagree on the version, operation enum
  or operation status
- **THEN** the Node contract test fails

### Requirement: Canonical serialization matches ECMAScript

The wire crate SHALL parse strict JSON and emit wire and canonical forms.
Numbers SHALL use ECMAScript `Number#toString`, with negative zero as `0`.
Canonical object keys SHALL sort by UTF-16 code units; arrays SHALL preserve
order; absent fields SHALL stay omitted and explicit nulls SHALL persist.
Duplicate keys and non-finite numbers SHALL be rejected. The comparison-only
canonical encoding SHALL be explicitly versioned and SHALL remain separate from
the legacy compatibility encoding.

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

### Requirement: Legacy canonical compatibility is exact

Rust SHALL reproduce the v0.14.0 TypeScript `canonicalize` plus
`JSON.stringify` output for legacy fingerprints, seeds and identities. Object
keys SHALL enumerate array-index keys in ascending numeric order first, then
the remaining keys sorted by UTF-16 code units, recursively. The TypeScript
oracle SHALL NOT be changed to match Rust.

**Source**: Issue #535
**Tests**: `crates/grimoria-wire/src/json.rs`, `fixtures/conformance/wire-legacy-vectors.json`, `scripts/wire-differential.test.ts`

#### Scenario: Numeric-key divergence

- **WHEN** an object has keys `"1"`, `"2"` and `"10"`
- **THEN** the legacy form is `"1"`, `"2"`, `"10"` even though the comparison
  canonical form is `"1"`, `"10"`, `"2"`

#### Scenario: Historical index boundary

- **WHEN** keys include `"0"`, `"4294967294"`, `"4294967295"`, `"01"`, `"-1"`
  and `"1.5"`
- **THEN** only the canonical array indices sort numerically first and the other
  keys sort by UTF-16 code units

#### Scenario: Prototype key

- **WHEN** the legacy input contains a `"__proto__"` key
- **THEN** the legacy encoding omits it exactly as the v0.14.0 TypeScript
  canonicalizer does

### Requirement: Differential parity is executable

Committed fixtures SHALL be compared with ECMAScript `JSON.stringify` and the
existing v0.14.0 TypeScript canonicalizer. The compiled WASM exports SHALL run
through the JavaScript boundary under Node. Existing persisted fingerprints and
the portable contract identities SHALL be verified against those fixtures.

**Source**: Issue #535
**Tests**: `scripts/wire-differential.test.ts`, `scripts/wire-wasm-parity.ts`

#### Scenario: WASM through JavaScript

- **WHEN** the Node differential runs on the generated bindings
- **THEN** wire, comparison canonical and legacy canonical bytes equal the
  ECMAScript and TypeScript expectations

#### Scenario: Persisted identity

- **WHEN** the portable contract identity fixture is checked
- **THEN** `identityOf` reproduces every expected idempotency identity

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

### Requirement: The resolved dependency graph is pinned

The full resolved graph SHALL be checked against an approved name, version and
crates.io source for every direct and transitive package. Each external package
SHALL match its lock checksum. Path, git or patched substitutions and source
replacements SHALL fail.

**Source**: Issue #535
**Tests**: `scripts/check-cargo-graph.test.ts`

#### Scenario: Substitution

- **WHEN** an approved package is replaced by a path, git source, patch or
  source replacement, or its locked checksum differs
- **THEN** the graph check fails

### Requirement: Contract failures are structured and bounded

Every parse or contract failure SHALL return a machine-readable response with
the stable code `engine-contract-violation`, a category and the relevant
offset or limit. It SHALL NOT require parsing free-form exception text. Input
bytes, nesting, collection entries and total nodes SHALL be bounded. The
default limits SHALL accept large legacy saves and journals, and duplicate-key
detection SHALL be constant-time per key.

**Source**: Issue #535
**Tests**: `crates/grimoria-wire/src/json.rs`, `contracts/wire/error.schema.json`, `crates/grimoria-wasm/src/lib.rs`

#### Scenario: Malformed input

- **WHEN** the parser receives malformed JSON
- **THEN** the response carries `code`, `kind`, `message` and an offset

#### Scenario: Oversized input

- **WHEN** input, nesting or a collection exceeds its limit
- **THEN** the response carries `kind: "limit"` with `max` and `actual`

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
