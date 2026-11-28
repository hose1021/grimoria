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

### Requirement: Unsupported state semantics fail closed

The slice SHALL accept only state whose effects are absent or contain no
`poison`, `drunk` or `pukka-death` effect, and whose state invariants pass.
Impairing or Pukka effects and invariant failures SHALL return
`unsupported-state` before mutation. The slice SHALL NOT implement character
mechanics or fabricate an allowed result for unsupported semantics.

**Source**: Issue #535
**Tests**: `crates/grimoria-domain/src/command.rs`, `scripts/set-notes-differential.ts`

#### Scenario: Impairing effect

- **WHEN** the state contains a poison effect
- **THEN** apply rejects with `unsupported-state` and leaves the state unchanged

### Requirement: Timestamps use an explicit host boundary

Preparation SHALL keep the supplied `at` in the prepare result and compute a
canonical UTC timestamp for execution. ISO dates with milliseconds and numeric
offsets SHALL normalize to `YYYY-MM-DDTHH:MM:SS.sssZ`. An invalid host clock
SHALL reject with the TypeScript host-clock error, and an invalid command
timestamp with the command-timestamp error.

**Source**: Issue #535
**Tests**: `crates/grimoria-domain/src/command.rs`, `fixtures/conformance/set-notes-cases.json`

#### Scenario: Offset input

- **WHEN** the command timestamp carries a numeric offset
- **THEN** the result and journal use the same canonical UTC time as TypeScript

### Requirement: Prepare and command results are distinct

`prepare` SHALL return only the `PrepareResult` shape, while validate, preview
and apply SHALL return `CommandResult`. Preparation SHALL keep TypeScript's
validation order and reject whitespace-only ids, null payloads and unknown
payload fields with the exact codes and reasons.

**Source**: Issue #535
**Tests**: `scripts/set-notes-differential.ts`

#### Scenario: Whitespace id

- **WHEN** the command id is whitespace only
- **THEN** prepare returns `command-missing-id` with the empty-id reason

### Requirement: Replay fails closed

Replay SHALL reject a missing journal, missing base or non-object base with
`journal-invalid`, and an unsupported or already-applied entry with
`journal-dependency`. Failure SHALL leave the input state unchanged.

**Source**: Issue #535
**Tests**: `crates/grimoria-domain/src/command.rs`, `scripts/set-notes-differential.ts`

#### Scenario: Malformed base

- **WHEN** the journal base is not an object
- **THEN** replay returns `journal-invalid` and does not replace the state

### Requirement: setNotes matches TypeScript

Validate, preview and apply SHALL match TypeScript for complete command results,
rejections, unchanged state, events, applied identity, journal entry,
coalescing and idempotency. A reused id with different content SHALL return
`command-id-conflict`. Event ids SHALL keep lone-surrogate command units.

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
the compiled WASM on identical inputs. It SHALL compare complete outputs,
replay events, every runtime ruleset, sequential coalescing and the legacy v4
round-trip. It SHALL fail when `--inject-divergence` changes one field.
Diagnostics SHALL contain field paths and digests only, never state bodies,
notes, role names or secrets.

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
