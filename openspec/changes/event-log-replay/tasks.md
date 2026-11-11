# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add `replay` tests to `js/commands.test.mjs`: a recorded command sequence replayed through the production reducer equals `canonicalState(state)`; a journal with its last entry removed equals the pre-command snapshot; a repeated id appends no journal entry and creates no second effect; a rejected command leaves the journal unchanged; a journal missing a dependency returns `journal-dependency`. Verify with `node --test js/commands.test.mjs`; it must fail because `replay` does not exist.
- [x] 1.2 Extend invariant 5 in `js/invariants.test.mjs` to replay `state.journal` through the production `replay` (state and emitted events) and to rebuild the undone state from the journal slice, instead of hand-applying the command array.
- [x] 1.3 Add store tests in `src/application/store/create-game-store.test.ts`: undo is a journal replay leaving `canRedo()` true, redo restores the state, a new dispatch clears redo, and an adopted cross-tab save still clears the history. Verify with `node --test src/application/store/create-game-store.test.ts`; it must fail because `redo` and the journal are absent.
- [x] 1.4 Record the RED commands and observed failures in the Evidence section before implementation.

## 2. GREEN: journal and replay

- [x] 2.1 Add `JournalEntry`, `GameJournal` and `GameState.journal` in `src/core/model/types.ts`; default it in `createGame`, the v2/v3 migrations and `importGame`, and validate its shape in `validateState`. Keep `state.log` as the narrative feed.
- [x] 2.2 Record each accepted command in `applyCommand` after the draft commits: the base state on the first entry, then id, type, payload, resolved timestamp, ruleset version, fingerprint and undo flag. A rejected command records nothing.
- [x] 2.3 Reject or no-op a repeated id from the journal as well as the applied ledger, so a `record: false` command cannot append twice.
- [x] 2.4 Add `src/core/engine/replay.ts` with `replay(journal)`: clone the base, apply the entries in order with their pinned timestamps and the seeded PRNG, and return the rebuilt state plus the replayed events. A rejected entry returns `journal-dependency` with its id.
- [x] 2.5 Export `replay` from `src/core/engine/index.ts`; extend `canonicalState` to ignore the journal.
- [x] 2.6 Verify task 1.1 and 1.2 pass.

## 3. GREEN: journal-backed undo and redo

- [x] 3.1 Replace the snapshot ring in `create-game-store.ts` with journal-driven undo: remove the last undoable entry at or above the load floor, replay the rest, persist, and push the removed entry to a redo stack. A failed replay or save leaves the state unchanged.
- [x] 3.2 Add `redo()` and `canRedo()`; a successful dispatch clears the redo stack. The legacy `run(mutator)` escape hatch keeps one pre-mutation snapshot and resets the journal base because an arbitrary mutation cannot be replayed.
- [x] 3.3 Keep the edit paths (`reset`, `replaceState`, import) starting a fresh journal with the new state as its base; set the undo floor on load so an adopted save clears undo history.
- [x] 3.4 Expose `redo` and `canRedo` through `js/store.js`; remove the dead snapshot ring.
- [x] 3.5 Verify task 1.3 passes.

## 4. REFACTOR and documentation

- [x] 4.1 Remove dead branches, stale comments and unused imports; keep the `setOrder` seat renumbering, the step-draft module and the read-model screens untouched.
- [x] 4.2 Update the `docs/rules-matrix.md` row for the event log and deterministic replay with its new tests and status.

## 5. Verification and documentation

- [x] 5.1 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 5.2 Report the RED and GREEN evidence, changed paths and test counts on the pull request; do not merge.

## Evidence

- RED: `node --test js/commands.test.mjs js/invariants.test.mjs` -> `SyntaxError: The requested module './engine.js' does not provide an export named 'replay'`; both suites failed to load because the reducer did not exist.
- RED: `node --test src/application/store/create-game-store.test.ts` -> 16 pass, 2 fail: "undo and redo replay the journal and a new dispatch clears redo" failed with `TypeError: game.canRedo is not a function`, and "a legacy save without a journal keeps its log and accepts a command" failed with `actual: undefined, expected: { base: null, entries: [] }`.
- GREEN: `node --test js/commands.test.mjs js/invariants.test.mjs src/application/store/create-game-store.test.ts` -> 60 tests, 60 pass. The new tests assert that `replay(state.journal)` equals the saved `canonicalState`, that replaying the journal without its last entry equals the pre-command snapshot, that removing `startNight` yields `journal-dependency`, that a repeated id appends no entry and no effect, that a rejected command records nothing, and that store undo/redo replay the journal.
- FULL: `npm test` -> 399 tests, 399 pass. `npm run verify` (typecheck, oxlint, format check, build, fallback, offline, source policy) passes; `node scripts/openspec-check.mjs` passes for 19 specs and 3 active changes; `openspec validate --changes --strict` and `openspec validate --specs --strict` pass; `git diff --check` is clean.
- The journal stores one base state and the ordered command inputs, not PRNG state: the seed is re-derived from id, fingerprint and canonical state, and each entry's resolved `at` pins the clock, so the same inputs replay deterministically without touching the wall clock.
- Limitation: a save written before this change has no command journal, so only its state and narrative log survive; the first new command starts the base. `store.run(mutator)` is a legacy escape hatch and keeps one pre-mutation snapshot because an arbitrary mutation cannot be expressed as a command.

