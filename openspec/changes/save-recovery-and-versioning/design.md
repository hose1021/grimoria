# Design

## Context

The store (`src/application/store/create-game-store.ts`) owns the game key
`pg.game.v4` and persists after every accepted command. It loads `readRaw()`,
migrates a legacy value through `importGame` (`migrateV2`/`migrateV3`), backs up
a corrupt value through the `backup` port and reports the problem on
`loadStatus`. The command engine records every applied command id in
`state.applied`, so a repeated command with the same type, payload and ruleset
version is a no-op.

The console (`src/ui/screens/table/`) keeps the unfinished step in
`useTableDrafts`: targets, redirects, registrations, given answers and the
BMR/S&V drafts. None of it reaches the store until the host completes the step,
so a reload loses the untouched choice. `state.night.queue` and
`state.night.currentIndex` are persisted, so the step itself survives.

Constraints:

- The game schema stays v4; `SCHEMA_VERSION`, `STORAGE_KEY` and the legacy
  keys stay the single source of truth in `src/core/model/state.ts`.
- Screens persist through ports; `src/ui` never touches `localStorage`.
- A draft is not a game mutation: it must not advance the revision, enter the
  undo history or grow `state.applied`.
- UI tests stay DOM-free, so the draft record is a pure module.

## Goals / Non-Goals

**Goals:**

- Restore the current step and its untouched draft after a reload.
- Prove migration idempotence, reload idempotence of commands and the corrupt
  backup with tests.
- Remove the duplicated key literals from the storage adapter.

**Non-Goals:**

- A schema change, a new storage key for the game, or a redesigned migration.
- Persisting every open overlay (role card, grimoire, dialogs). Only the step
  draft is part of the recovery contract.
- Merging the pull request or changing `docs/rules-matrix.md` (no role status
  changes).

## Decisions

### 1. Draft lives in the preference keyspace, not in the game

The draft is stored under `pg.stepDraft` through the existing `PreferenceStore`
port, separate from `pg.game.v4`. It is a single JSON record
(`StepDraftRecord`): the namespaced step key
`createdAt:night:stepKey` plus targets, redirect, registrations, given answer
and the BMR/S&V draft fields.

Rejected alternative: a new command or a `state.night.draft` field. It would
advance the revision on every click, fill `state.applied` and the undo history
with draft changes, and need a schema/validation change. The issue only needs
recovery, and the store stays the only writer of the game key.

### 2. Only the current step is restored

`readStepDraft(read, draftKey)` returns the record only when its key matches the
console's current `createdAt:night:stepKey`; a foreign or corrupt value returns
`null`. The console writes the record whenever the current step's draft
changes, so at most one record exists and a completed or replaced step can
never leak into another one. The key already includes the game creation time
and the night number, so a new game or the next night starts empty.

### 3. The adapter imports the key constants

`src/infrastructure/storage/local-game-storage.ts` repeated `pg.game.v4`,
`pg.game.v3` and `pg.game.v2`. It now imports `STORAGE_KEY`, `LEGACY_KEY` and
`LEGACY_V2_KEY` from `src/core/model/state.ts` (the allowed infrastructure →
core direction), so a version bump changes one place.

### 4. Backup and migration behavior stays, tests make it explicit

`fresh()` already calls `storage.backup(corruptRaw)`, leaves the raw value on
disk and reports the error plus the backup key. `load()` already migrates a
legacy fallback once and writes the migrated v4 value. The change adds tests
that pin both: the explicit error/backup key, the untouched raw value, the
identical second load with no rewrite, and the no-op replay of an already
applied command after a fresh store.

### 5. `setOrder` keeps `seat` in sync with `order`

The reload-replay test exposed a real gap: `setOrder` changed `order` but left
each `player.seat` at its old position. `validateState` and `importGame`
require `player.seat === order.indexOf(id) + 1`, so the store saved a game that
it then rejected on the next load and silently replaced with a fresh one. The
command now renumbers the seats from the new order, which also makes the
persisted applied-command ledger survive the reload.


## Risks / Trade-offs

- **Draft in the preference keyspace** → It is not covered by the game's
  revision or export. That is intended: it is a recovery aid, not saved game
  data. A lost draft only costs re-selection; the step itself survives.
- **Stale draft record** → The key check makes it inert. The next draft write
  overwrites it, so the key never accumulates records.
- **Preferences unavailable (private mode, quota)** → `PreferenceStore.set`
  never throws; the console keeps working in memory and only loses the
  recovery aid.
- **UI tests stay DOM-free** → The pure record module is tested with the real
  store and a memory storage, so the test exercises the same load path as the
  browser.

## Migration Plan

No schema, key or data migration. Existing saves load unchanged. Deployment is
the normal branch update; rollback is the previous commit. Nothing is written
to the game key on load except the existing one-time legacy migration.
