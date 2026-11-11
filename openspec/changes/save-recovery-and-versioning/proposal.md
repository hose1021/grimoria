# Proposal

Issue: #31

## Why

A reload in the middle of a night step keeps the saved game but drops the
Storyteller's untouched draft: the chosen targets, registrations, redirect and
given answers live only in React state. The host has to remember and re-enter
them. The save format also needs an explicit audit: one schema version, one
game key, one writer, a corrupt-save backup that reports the problem, an
idempotent v2/v3 migration and a command ledger that survives a reload.

## What Changes

- Persist the untouched draft of the current night step under its own
  preference key (`pg.stepDraft`) and restore it after a reload so the same
  step opens with the same chosen targets and answers.
- Ignore a stored draft whose key does not match the current game, night and
  step, and ignore a corrupt value.
- Make the game key a single source of truth by having the storage adapter
  import `STORAGE_KEY` and the legacy keys from the state model instead of
  repeating the literals.
- Prove with RED → GREEN tests that:
  - a reload mid-night restores the step and its chosen targets/draft;
  - a v2 or v3 save migrates once and a second load is idempotent and valid;
  - a command applied before a reload is not applied twice after it;
  - a corrupt save is backed up, left in place and reported with an explicit
    load error.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/state-and-storage`: adds mid-step draft recovery, idempotent migration
  and reload replay requirements, and strengthens the corrupt-save reporting.

## Impact

- Runtime: `src/ui/screens/table/step-draft.ts` (new),
  `src/ui/screens/table/drafts.ts`, `src/ui/screens/table/index.tsx`,
  `src/ui/screens/table/cards.tsx`,
  `src/infrastructure/storage/local-game-storage.ts`, and a one-line seat sync
  in `src/core/engine/commands.ts` `setOrder` so a reordered game stays
  loadable (shared edit: engine).
- Tests: `src/ui/screens/table/step-draft.test.ts` (new),
  `src/application/store/create-game-store.test.ts`.
- The game schema stays v4 and the game key stays `pg.game.v4`; no migration is
  added or removed. No new dependency.
