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

### Requirement: Import rejects cyclic effect states

The store SHALL validate the effect graph of an imported game. If the graph contains an unresolvable dependency cycle, import SHALL fail with `CYCLIC_EFFECT_DEPENDENCY` and SHALL leave the current in-memory game and the stored save unchanged.

**Source**: Owner decision on PR #24
**Tests**: `js/store.test.mjs`

#### Scenario: Cyclic import

- **WHEN** the host imports a structurally valid game whose effects contain a same-night mutual poison cycle
- **THEN** import returns `CYCLIC_EFFECT_DEPENDENCY`, the current game keeps its previous state, and the storage key keeps its previous value

#### Scenario: Valid sequential mutual poison import

- **WHEN** the imported game contains mutual poison effects that chronological creation order resolves
- **THEN** import succeeds and the restored state preserves both effects

### Requirement: Saved cyclic state is handled as corrupt

When the store loads a saved game whose effect graph contains an unresolvable dependency cycle, the store SHALL report a load failure, SHALL keep the original saved value under the corrupt-save backup key, and SHALL NOT overwrite it with a replacement.

**Source**: Owner decision on PR #24
**Tests**: `js/store.test.mjs`

#### Scenario: Cyclic saved game

- **WHEN** the game key contains a schema-valid save with a poison dependency cycle
- **THEN** loading reports failure, the raw value is kept under the timestamped backup key, and no cyclic state replaces it

### Requirement: Unified domain model coverage

The state model SHALL name, for every domain notion listed in issue #28, the
stored field or the explicit derivation that owns it, and SHALL keep that map
in `design.md`.

**Source**: [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039)
**Tests**: `src/core/model/state.test.ts`, `js/engine.test.mjs`, `js/bmr.test.mjs`

#### Scenario: Notion owned by a field

- **WHEN** the host records a death
- **THEN** `player.alive`, `player.deadAt` and the `deaths` history hold it, and no second death flag exists

#### Scenario: Notion owned by a derivation

- **WHEN** the engine needs to know whether an ability is healthy
- **THEN** it reads the poison/drunk effect graph through `isImpaired` and no player field mirrors the result

#### Scenario: Stored change with a derived fallback

- **WHEN** a role change records a new alignment
- **THEN** `player.team` stores that change and `realTeamOf()` remains the fallback for every other player

### Requirement: Effect source, target and interval

`validateState` SHALL reject a saved or imported effect that has no existing
source player, no existing target player, no interval, or a malformed interval;
it SHALL accept an open-ended effect whose `expires` is absent or `null`.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039) (drunk and poison timing and persistent effects); [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168) (poison, drunk)
**Tests**: `src/core/model/state.test.ts`

#### Scenario: Missing source or target

- **WHEN** an effect names no source player or no target player
- **THEN** validation fails with a message naming that field

#### Scenario: Missing or malformed interval

- **WHEN** an effect has no `start`, or `start` or `expires` lacks a phase or an integer cycle number
- **THEN** validation fails with `Invalid effect interval.`

#### Scenario: Open-ended effect

- **WHEN** a No Dashii, Sweetheart or Pukka effect has no expiry
- **THEN** validation accepts it and the effect stays active until the game ends

### Requirement: Legacy saves load under the interval rule

A game the app wrote at schema v2 or v3 SHALL still load and validate after
the effect interval rule, including an effect that already carries an
interval, and migration SHALL NOT invent an interval for an effect that lacks
one. An undated effect is the explicit exception: in an external or
hand-edited save, it is rejected rather than dated by guesswork.

**Source**: [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168); `SPEC.md` "State v4"
**Tests**: `src/core/model/state.test.ts`, `js/store.test.mjs`, `js/scripts.test.mjs`

#### Scenario: v3 save with an effect

- **WHEN** a v3 save containing a dated effect migrates
- **THEN** it becomes schema v4 and `validateState` returns no errors

#### Scenario: Undated legacy effect

- **WHEN** a legacy save contains an effect with no `start`
- **THEN** migration leaves it as it is and validation rejects it instead of inventing a cycle
