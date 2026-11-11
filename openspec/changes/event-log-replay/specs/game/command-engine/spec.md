# Spec Delta

## ADDED Requirements

### Requirement: Command journal

Every accepted command SHALL be recorded in `state.journal` with its id, type,
payload, resolved timestamp, ruleset version, canonical fingerprint and undo
flag; the first entry SHALL establish the base state, and a rejected command
SHALL NOT be recorded.

**Source**: Issue #30; `SPEC.md` "State v4" (`applied`); `src/core/engine/AGENTS.md`
**Tests**: `js/commands.test.mjs`, `js/invariants.test.mjs`

#### Scenario: Accepted command

- **WHEN** a command is applied to the game
- **THEN** one journal entry carries its id, type, host payload, resolved timestamp, ruleset version and fingerprint

#### Scenario: Rejected command

- **WHEN** a command is rejected by validation, apply or an invariant check
- **THEN** no journal entry is added and the state is unchanged

### Requirement: Deterministic replay

`replay(journal)` SHALL rebuild the saved state by applying the recorded entries
in order with their pinned timestamps and the seeded PRNG; the rebuilt state
SHALL compare equal to the saved state under `canonicalState`, and a repeated
command id SHALL NOT append a second entry, death or effect.

**Source**: Issue #30; `docs/rules-matrix.md` defect 5; [Issue #19](https://github.com/hose1021/grimoria/issues/19) "Definition of Done"
**Tests**: `js/commands.test.mjs`, `js/invariants.test.mjs`

#### Scenario: Replay equals the saved state

- **WHEN** a recorded journal is replayed
- **THEN** the rebuilt state equals the saved state and the replayed domain events equal the recorded ones

#### Scenario: Repeated command id

- **WHEN** a command with an already recorded id and the same fingerprint is applied again
- **THEN** the result is `idempotent`, the journal keeps one entry, and no second death or effect is created

### Requirement: Journal-backed undo and redo

Undo SHALL remove the last undoable journal entry, replay the remaining entries
and persist the result; redo SHALL re-insert the removed entry and replay it; a
remaining entry that no longer applies SHALL stop the operation with
`journal-dependency` and leave the state unchanged.

**Source**: Issue #30; `SPEC.md` "State v4"
**Tests**: `src/application/store/create-game-store.test.ts`, `js/commands.test.mjs`

#### Scenario: Undo then replay

- **WHEN** the host undoes the last accepted command
- **THEN** the state equals the state before that command and redo restores it

#### Scenario: Dependent entry

- **WHEN** replaying the journal without an entry rejects another recorded entry
- **THEN** the operation returns `journal-dependency` naming that entry and the state is unchanged

### Requirement: Legacy save keeps its history

A save written before the journal SHALL load with an empty journal and its
existing narrative log and applied ledger intact, and the first accepted
command SHALL start a new base state.

**Source**: Issue #30; `SPEC.md` "State v4"
**Tests**: `src/application/store/create-game-store.test.ts`, `js/store.test.mjs`

#### Scenario: Old save

- **WHEN** a v4 save without `journal` is loaded
- **THEN** the store keeps `state.log` and `state.applied`, starts with an empty journal, and accepts a command
