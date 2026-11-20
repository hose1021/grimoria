# Spec Delta

## ADDED Requirements

### Requirement: One coordinator owns the resolution order

The engine SHALL resolve an action in one coordinator in this order: intent,
attack, protection and redirect, death or execution, on-death and character
change, win. It SHALL reuse `effects.ts` for protection, `death.ts` for attack,
death, succession and win, and `retention.ts` for retained ability. It SHALL
keep `state.log`, `state.journal`, `state.applied` and derived `DomainEvent[]`
as the only history. It SHALL NOT add an event bus, a second journal or a
second death path.

**Source**: `docs/adr/0002-engine-contracts.md` §3; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/commands.test.ts`, `src/core/engine/invariants.test.ts`

#### Scenario: Attack resolution stays ordered

- **WHEN** an attack is blocked, redirected or lethal
- **THEN** the block or redirect resolves before the death record, and the death record resolves before the win check

#### Scenario: A death starts one shared path

- **WHEN** a capability returns a kill intent
- **THEN** `kill` writes the one death record, applies protection and impairment, and adds the one log line

#### Scenario: No second history

- **WHEN** a capability or coordinator records a consequence
- **THEN** it writes through `state.log` or the command journal, and derives events from the state diff

### Requirement: Every command uses one transaction boundary

A command SHALL pass through prepare, validate, draft apply, invariants,
commit, persist and publish, in that order. Prepare SHALL bind the id to a
fingerprint of type, payload and ruleset version. Validate and preview SHALL
run on a clone. A rejected command and a `requires-storyteller-choice` result
SHALL return before commit. A failed save SHALL restore the pre-command state.
A repeated id with the same fingerprint SHALL be idempotent; different content
SHALL return `command-id-conflict`.

**Source**: `docs/adr/0002-engine-contracts.md` §4; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/commands/prepare.test.ts`, `src/core/engine/commands.test.ts`, `src/application/store/create-game-store.test.ts`, `src/core/engine/invariants.test.ts`

#### Scenario: Preview does not commit

- **WHEN** `previewCommand` runs an allowed command
- **THEN** it returns events and consequences, and the canonical state is unchanged

#### Scenario: A rejected command leaves no trace

- **WHEN** validate or apply rejects a command
- **THEN** the live state, journal, log and revision are unchanged

#### Scenario: A save failure rolls back

- **WHEN** the store cannot persist an applied command
- **THEN** it restores the pre-command clone and returns `persist-failed`

#### Scenario: A reused id

- **WHEN** a command reuses an id with the same fingerprint
- **THEN** the result is idempotent; a different fingerprint returns `command-id-conflict`

### Requirement: Lifecycle transitions have explicit guards

The game SHALL use the phase union `setup`, `deal`, `seat`, `night`, `day`,
`over` and SHALL change phase only in the engine function that owns the
transition. Each transition SHALL reject an unmet precondition. A declared win
SHALL move the game to `over`. A same-edition custom script SHALL use the
normal path.

**Source**: `docs/adr/0002-engine-contracts.md` §6; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/engine/setup.test.ts`, `src/core/engine/commands.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Night cannot end early

- **WHEN** the host ends a night with an unfinished step or a pending Demon heir
- **THEN** `endNight` rejects and the phase stays `night`

#### Scenario: Day cannot end with a madness review

- **WHEN** a madness review is due
- **THEN** `endDay` rejects and the phase stays `day`

### Requirement: Manual-only scripts stay manual

A mixed-edition custom script SHALL set `manualOnly`. A manual-only game SHALL
build no automatic night queue, resolve no automatic secret and declare no
automatic winner. The host records effects and the winner.

**Source**: `docs/adr/0002-engine-contracts.md` §6; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/engine/setup.test.ts`, `src/core/engine/commands.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Mixed edition is manual

- **WHEN** a custom script mixes editions without `manualOnly`
- **THEN** the model rejects the script; with `manualOnly` it builds no automatic night queue and declares no automatic winner

### Requirement: Versioning and replay stay compatible

A slice SHALL keep the storage key `pg.game.v4`, `SCHEMA_VERSION = 4`, the
accepted `RULESET_VERSION`, the command payloads and the journal entry fields.
A replay SHALL reproduce the canonical state from the recorded journal. An
export and import SHALL reproduce the same canonical state. A new optional
field SHALL validate on load before a later slice writes it.

**Source**: `docs/adr/0002-engine-contracts.md` §7; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/engine/commands.test.ts`, `src/core/engine/invariants.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Replay reproduces the saved game

- **WHEN** a journal is replayed through the command path
- **THEN** the canonical state equals the saved state, and a non-reproducible entry returns `journal-dependency`

#### Scenario: Export and import round trip

- **WHEN** a v4 game is exported and imported
- **THEN** the canonical state is identical and the storage key is unchanged

#### Scenario: Unknown ruleset version

- **WHEN** a command declares a ruleset version the build does not accept
- **THEN** it is rejected before any state is read
