# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Corrupt save recovery

The store SHALL keep a corrupt value under a timestamped backup key, report the
problem, and accept a valid replacement game.

**Source**: `SPEC.md` "State v4"
**Tests**: `js/store.test.mjs:100`, `src/application/store/create-game-store.test.ts`

#### Scenario: Corrupt JSON object

- **WHEN** the saved game has missing players
- **THEN** the load reports failure, keeps the broken value and stays usable

#### Scenario: Explicit load error and backup

- **WHEN** the game key contains an unparseable or invalid save
- **THEN** `loadStatus` reports the problem and the backup key, the original value stays in the game key, and the store starts a fresh validated game
