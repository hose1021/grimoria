# Proposal

Issue: #30

## Why

The store kept the undo history as a twelve-slot ring of cloned states. It
restored a previous snapshot but could not prove that replaying the recorded
actions reaches the current game: a snapshot is only a copy, not an explanation.
The issue replaces that ring with a deterministic command journal: every
accepted command is recorded with its canonical fingerprint, the host's chosen
payload, the pinned clock and the seed input, so `replay(journal)` rebuilds the
saved state. Undo and redo become replays of the journal, a rejected command
never enters it, and a repeated command id cannot stack a second death or
effect.

## What Changes

- Record every accepted command in `state.journal` with its id, type, payload,
  resolved timestamp, ruleset version, canonical fingerprint and undo flag.
  The journal keeps one base state plus the ordered entries; it replaces the
  snapshot ring as the history mechanism.
- Add the pure `replay(journal)` reducer: rebuild the base state and apply the
  entries in order with their pinned timestamps and the existing seeded PRNG.
- Derive undo and redo from the journal with `replay`: removing an entry and
  replaying the rest is undo; re-inserting it is redo. A remaining entry that
  no longer applies stops undo with `journal-dependency`.
- Keep the applied-command ledger as the idempotency gate: a repeated id with
  the same fingerprint appends no journal entry, and a rejected command appends
  nothing.
- Load a save without a journal (written before this change) with an empty
  journal and its narrative `state.log` intact.
- Prove with RED → GREEN tests that:
  - `replay(journal)` equals the saved state;
  - undo plus replay is consistent;
  - a repeated id does not create a second death or effect;
  - a rejected command never reaches the journal.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/command-engine`: adds the command journal, deterministic replay,
  journal-backed undo/redo with a dependency check, and journal idempotency.

## Impact

- Runtime: `src/core/model/types.ts` and `src/core/model/state.ts` (the
  `journal` field, schema default and validation), `src/core/engine/commands.ts`
  (journal recording and idempotency), `src/core/engine/replay.ts` (new),
  `src/core/engine/index.ts` (export), `src/application/store/create-game-store.ts`
  (journal-driven undo/redo), `js/store.js` (facade exports).
- Tests: `js/commands.test.mjs`, `js/invariants.test.mjs`,
  `src/application/store/create-game-store.test.ts`.
- The schema stays v4 and the game key stays `pg.game.v4`. No new dependency.
  `state.log` stays the narrative console feed; the command journal is the
  separate `state.journal`.
