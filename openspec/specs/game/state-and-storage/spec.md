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
**Tests**: `src/entry/store.test.ts`, `src/core/model/scripts.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: v3 save

- **WHEN** the store loads a v3 save
- **THEN** the game is upgraded to v4 with the Trouble Brewing script

### Requirement: Corrupt save recovery

The store SHALL keep a corrupt value under a timestamped backup key, report the
problem, and accept a valid replacement game.

**Source**: `SPEC.md` "State v4"
**Tests**: `src/entry/store.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Corrupt JSON object

- **WHEN** the saved game has missing players
- **THEN** the load reports failure, keeps the broken value and stays usable

#### Scenario: Explicit load error and backup

- **WHEN** the game key contains an unparseable or invalid save
- **THEN** `loadStatus` reports the problem and the backup key, the original value stays in the game key, and the store starts a fresh validated game

### Requirement: Save, rollback and persisted revisions

The store SHALL save after every accepted command, SHALL roll the in-memory
state back and report `persist-failed` when the save fails, and SHALL not
confirm an unsaved change.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `src/entry/store.test.ts`, `src/entry/store.test.ts`, `src/entry/store.test.ts`

#### Scenario: Quota failure

- **WHEN** the browser storage rejects the write
- **THEN** the command reports `persist-failed` and the in-memory state matches the last saved state

### Requirement: Concurrent tabs

The store SHALL reject a write from a tab whose revision is older than the disk
revision and SHALL leave an already saved game untouched.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `src/entry/store.test.ts`, `src/entry/store.test.ts`

#### Scenario: Stale tab

- **WHEN** a tab holds revision 4 and the disk holds revision 10
- **THEN** the tab cannot overwrite the newer save

### Requirement: Import and export validation

The store SHALL validate an imported or exported game structurally, SHALL leave
the current game and disk unchanged on a malformed import, and SHALL keep the
secret-data warning.

**Source**: `SPEC.md` "Scenarios"; `AGENTS.md` "Code Conventions"
**Tests**: `src/entry/store.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Malformed import

- **WHEN** the host imports a game with an invalid player table
- **THEN** the import fails and the existing game is unchanged

### Requirement: Claim and name persistence

The store SHALL persist player claims and names across save, reload and legacy
migration.

**Source**: `SPEC.md` `/player`
**Tests**: `src/entry/store.test.ts`

#### Scenario: Reload after a claim

- **WHEN** a player claims a seat and enters a name, then reloads
- **THEN** the seat stays claimed with the same name

### Requirement: Library storage isolation

The saved-pool library SHALL use its own storage key, SHALL never touch the game
key and SHALL tolerate a corrupt read.

**Source**: `SPEC.md` `/bag`
**Tests**: `src/infrastructure/library/bag-library.test.ts`, `src/infrastructure/library/bag-library.test.ts`

#### Scenario: Corrupt library

- **WHEN** the library value is not valid JSON
- **THEN** reading it returns an empty library without throwing

### Requirement: Import rejects cyclic effect states

The store SHALL validate the effect graph of an imported game. If the graph contains an unresolvable dependency cycle, import SHALL fail with `CYCLIC_EFFECT_DEPENDENCY` and SHALL leave the current in-memory game and the stored save unchanged.

**Source**: Owner decision on PR #24
**Tests**: `src/entry/store.test.ts`

#### Scenario: Cyclic import

- **WHEN** the host imports a structurally valid game whose effects contain a same-night mutual poison cycle
- **THEN** import returns `CYCLIC_EFFECT_DEPENDENCY`, the current game keeps its previous state, and the storage key keeps its previous value

#### Scenario: Valid sequential mutual poison import

- **WHEN** the imported game contains mutual poison effects that chronological creation order resolves
- **THEN** import succeeds and the restored state preserves both effects

### Requirement: Saved cyclic state is handled as corrupt

When the store loads a saved game whose effect graph contains an unresolvable dependency cycle, the store SHALL report a load failure, SHALL keep the original saved value under the corrupt-save backup key, and SHALL NOT overwrite it with a replacement.

**Source**: Owner decision on PR #24
**Tests**: `src/entry/store.test.ts`

#### Scenario: Cyclic saved game

- **WHEN** the game key contains a schema-valid save with a poison dependency cycle
- **THEN** loading reports failure, the raw value is kept under the timestamped backup key, and no cyclic state replaces it

### Requirement: Unified domain model coverage

The state model SHALL name, for every domain notion listed in issue #28, the
stored field or the explicit derivation that owns it, and SHALL keep that map
in `design.md`.

**Source**: [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039)
**Tests**: `src/core/model/state.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`

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
**Tests**: `src/core/model/state.test.ts`, `src/entry/store.test.ts`, `src/core/model/scripts.test.ts`

#### Scenario: v3 save with an effect

- **WHEN** a v3 save containing a dated effect migrates
- **THEN** it becomes schema v4 and `validateState` returns no errors

#### Scenario: Undated legacy effect

- **WHEN** a legacy save contains an effect with no `start`
- **THEN** migration leaves it as it is and validation rejects it instead of inventing a cycle

### Requirement: Mid-step reload recovery

The console SHALL persist the untouched draft of the current night step under
its own preference key and SHALL restore the same step and its chosen targets,
redirect, registrations, given answers and BMR/S&V draft values after a reload.
A stored draft whose key does not match the current game, night and step, or
whose value is corrupt, SHALL be ignored.

**Source**: [Issue #31](https://github.com/hose1021/grimoria/issues/31); `AGENTS.md` "Read-only interaction state … committed only when the host completes the step"
**Tests**: `src/ui/screens/table/step-draft.test.ts`

#### Scenario: Reload after choosing targets

- **WHEN** the host chooses targets in an unfinished night step and reloads
- **THEN** the same step is current and its targets, redirect, registrations and given answers are restored from the step draft

#### Scenario: Stale or corrupt draft

- **WHEN** the stored draft belongs to another game, night or step, the value is not valid JSON, or a field has the wrong type
- **THEN** the console starts the current step with an empty draft

### Requirement: Idempotent save migration

The store SHALL keep writing the single schema v4 game key, SHALL migrate a v2
or v3 save once — renumbering each seat from the saved order when the two
disagree — and SHALL load the migrated save again unchanged, without a second
write and without failing validation.

**Source**: `SPEC.md` "State v4"; [Issue #31](https://github.com/hose1021/grimoria/issues/31)
**Tests**: `src/application/store/create-game-store.test.ts`

#### Scenario: Second load

- **WHEN** a v2 or v3 save is loaded and a new store is created from the migrated value
- **THEN** both loads produce the same validated v4 state and the second load does not rewrite the game key

### Requirement: Command replay after reload

The store SHALL persist the applied-command ledger with the game and SHALL
treat a repeated command id with the same type, payload and ruleset version as
a no-op after a reload, so an applied command is never applied twice.

**Source**: `SPEC.md` "State v4" (`applied`); [Issue #31](https://github.com/hose1021/grimoria/issues/31)
**Tests**: `src/application/store/create-game-store.test.ts`

#### Scenario: Repeated command after reload

- **WHEN** a command was applied and saved, and the same prepared command is dispatched in a new store instance
- **THEN** the result reports `idempotent`, no new write happens and the state keeps exactly one application
