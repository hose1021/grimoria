# State and Storage Specification

## Purpose

Defines how one saved game is versioned, persisted, migrated, recovered and
exported, and how concurrent tabs and failed writes are handled.

## Requirements

### Requirement: Schema version and migration

The store SHALL persist schema v4 under the single game key, SHALL migrate v2
and v3 saves on load, and SHALL attach the Trouble Brewing script to a v3 save
that has none.

**Source**: `SPEC.md` "State v4"
**Tests**: `js/store.test.mjs:109`, `js/scripts.test.mjs:173`, `js/engine.test.mjs:586`

#### Scenario: v3 save

- **WHEN** the store loads a v3 save
- **THEN** the game is upgraded to v4 with the Trouble Brewing script

### Requirement: Corrupt save recovery

The store SHALL keep a corrupt value under a timestamped backup key, report the
problem, and accept a valid replacement game.

**Source**: `SPEC.md` "State v4"
**Tests**: `js/store.test.mjs:100`

#### Scenario: Corrupt JSON object

- **WHEN** the saved game has missing players
- **THEN** the load reports failure, keeps the broken value and stays usable

### Requirement: Save, rollback and persisted revisions

The store SHALL save after every accepted command, SHALL roll the in-memory
state back and report `persist-failed` when the save fails, and SHALL not
confirm an unsaved change.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/store.test.mjs:32`, `js/store.test.mjs:66`, `js/store.test.mjs:170`

#### Scenario: Quota failure

- **WHEN** the browser storage rejects the write
- **THEN** the command reports `persist-failed` and the in-memory state matches the last saved state

### Requirement: Concurrent tabs

The store SHALL reject a write from a tab whose revision is older than the disk
revision and SHALL leave an already saved game untouched.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/store.test.mjs:77`, `js/store.test.mjs:85`

#### Scenario: Stale tab

- **WHEN** a tab holds revision 4 and the disk holds revision 10
- **THEN** the tab cannot overwrite the newer save

### Requirement: Import and export validation

The store SHALL validate an imported or exported game structurally, SHALL leave
the current game and disk unchanged on a malformed import, and SHALL keep the
secret-data warning.

**Source**: `SPEC.md` "Scenarios"; `AGENTS.md` "Code Conventions"
**Tests**: `js/store.test.mjs:43`, `js/engine.test.mjs:586`

#### Scenario: Malformed import

- **WHEN** the host imports a game with an invalid player table
- **THEN** the import fails and the existing game is unchanged

### Requirement: Claim and name persistence

The store SHALL persist player claims and names across save, reload and legacy
migration.

**Source**: `SPEC.md` `/player`
**Tests**: `js/store.test.mjs:16`

#### Scenario: Reload after a claim

- **WHEN** a player claims a seat and enters a name, then reloads
- **THEN** the seat stays claimed with the same name

### Requirement: Library storage isolation

The saved-pool library SHALL use its own storage key, SHALL never touch the game
key and SHALL tolerate a corrupt read.

**Source**: `SPEC.md` `/bag`
**Tests**: `js/library.test.mjs:86`, `js/library.test.mjs:98`

#### Scenario: Corrupt library

- **WHEN** the library value is not valid JSON
- **THEN** reading it returns an empty library without throwing
