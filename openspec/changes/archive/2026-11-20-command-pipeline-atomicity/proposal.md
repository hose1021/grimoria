# Proposal

Issue: #213

Parent: #200. This change closes the store atomicity and record-only
idempotency gaps found by the independent audit. It does not add a new
concurrency mechanism.

## Why

The independent audit of `main` at `0a2934078bd0` found two defects:

- `reset`, `replaceState` and `importGame` called `persist()` with its default
  failure notification. A failed write published the replacement state before
  `runReplacement` rolled it back, so a subscriber could observe a game that was
  never saved.
- Record-only commands were absent from `state.applied` and relied on their
  journal entry. Journal coalescing replaces that entry, so reusing an older
  `setNotes`, `setReviewOpen` or `normalizeSecrets` id applied again instead of
  reporting `idempotent`.

The same audit could not reconcile #213's `expected state version` with the
accepted ADR 0002, which explicitly excludes a per-command game-revision
precondition. This change records the actual sequential guard and its
simultaneous-write limit instead of adding an unapproved transaction manager.

## What Changes

- Persist replacement operations with failure notification disabled, restore
  the state and history, then publish one failed status.
- Record every accepted command in `state.applied`, including record-only
  commands; keep the journal coalescing rule for replay size.
- Store a compact 128-bit identity in `state.applied` instead of the full
  canonical fingerprint. The journal and execution seed keep the full
  fingerprint; legacy full-fingerprint entries remain valid.
- Carry accepted applied entries across undo/redo replay and remove only the
  undone id, so an accepted coalesced id stays idempotent after undo, redo,
  save and reload. An undone id applies again as a new action.
- Add regressions for thrown writes and stale disk on all three replacement
  operations, a stale-disk dispatch between two stores, a command-level
  invariant refusal and record-only idempotency after coalescing.
- Document the sequential stale-write guarantee and the non-atomic
  simultaneous-write limitation in ADR 0002 and `SPEC.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/store-boundaries`: a failed replacement restores the game before it
  publishes, and no subscriber observes the replacement.
- `game/command-engine`: every accepted command is idempotent through
  `state.applied`, even when its journal entry is coalesced.

## Impact

`src/application/store/create-game-store.ts`, the command registry, the
asserting Node tests, ADR 0002, `SPEC.md` and this OpenSpec change. No dependency,
schema, storage key, rule pin, host-choice policy or UI change. No per-command
`expectedRevision` is added.
