## ADDED Requirements

### Requirement: State is lossless for the slice

The domain state SHALL parse and serialize with the Phase 1 wire encoding and
SHALL edit only `notes`, `applied` and `journal`. Every unknown field, nested
value, array order and UTF-16 code unit SHALL survive validate, preview and
apply.

**Source**: Issue #535
**Tests**: `crates/grimoria-domain/src/state.rs`, `scripts/set-notes-differential.ts`

#### Scenario: Unknown field

- **WHEN** a state carries an unknown numeric-key object
- **THEN** the applied state keeps it exactly

#### Scenario: Preview isolation

- **WHEN** a command is previewed
- **THEN** the input state bytes are unchanged

### Requirement: Command preparation is deterministic

Preparation SHALL accept a host-supplied timestamp, seed and id, fill a missing
id or timestamp from them, and reject an empty id, unsupported command, invalid
payload, unsupported ruleset or invalid timestamp. The legacy fingerprint and
identity SHALL reproduce the TypeScript algorithms exactly.

**Source**: Issue #535
**Tests**: `crates/grimoria-domain/src/command.rs`, `scripts/set-notes-differential.ts`

#### Scenario: Host inputs

- **WHEN** the command omits id and at
- **THEN** the host inputs supply both deterministically

#### Scenario: Unsupported command

- **WHEN** the command type is outside the slice
- **THEN** it fails explicitly instead of reporting success

### Requirement: setNotes matches TypeScript

Validate, preview and apply SHALL match TypeScript for complete command results,
state, events, applied identity, journal entry, coalescing and idempotency.
Rejection SHALL leave state unchanged; a reused id with different content SHALL
return `command-id-conflict`.

**Source**: Issue #535
**Tests**: `scripts/set-notes-differential.ts`, `fixtures/conformance/set-notes-cases.json`

#### Scenario: Complete result

- **WHEN** the same valid command runs in TypeScript and WASM
- **THEN** result, state, events, fingerprint, identity and journal are equal

#### Scenario: Idempotent and conflict

- **WHEN** an id is reused with the same or different content
- **THEN** the same content is idempotent and different content is a conflict

### Requirement: Replay is slice-only and deterministic

Replay SHALL rebuild only journals made of `setNotes` entries, place the
journal after `applied`, and fail with `journal-dependency` for unsupported or
already-applied entries.

**Source**: Issue #535
**Tests**: `crates/grimoria-domain/src/command.rs`, `scripts/set-notes-differential.ts`

#### Scenario: Replay twice

- **WHEN** the same journal is replayed twice
- **THEN** both resulting states are equal to the saved state

### Requirement: Differential gate detects divergence

The committed differential harness SHALL execute the real TypeScript engine and
the compiled WASM on identical inputs. It SHALL compare complete outputs and
SHALL fail when `--inject-divergence` changes one field.

**Source**: Issue #535
**Tests**: `scripts/set-notes-differential.ts`

#### Scenario: Injected mismatch

- **WHEN** one actual field is changed deliberately
- **THEN** the differential gate reports a mismatch

### Requirement: No production cutover

Phase 2 SHALL NOT load WASM from production, change TypeScript gameplay, change
`pg.game.v4`, migrate a role or cut over the engine. The TypeScript engine stays
the sole production engine.

**Source**: Issue #535
**Tests**: `scripts/wire-contract.test.ts`, `scripts/set-notes-differential.ts`

#### Scenario: Production import

- **WHEN** a production module imports the domain or a WASM asset
- **THEN** the boundary check fails
