# Tasks

## Engine record

- [x] Add the Sailor and Innkeeper choice notes with the chosen players and the drunk player.
- [x] Add the `note.bmr.sailorChoice` and `note.bmr.innkeeperChoice` strings to `ru`, `en` and `az`.
- [x] Update the engine and role expectations that pinned the old "Шаг выполнен." line.

- RED: `node --test --test-name-pattern="the Sailor's choice makes one player drunk" src/core/engine/bmr.test.ts` failed with `detail: 'Шаг выполнен.'` against the updated expectation.
- RED: `node --test src/core/roles/sailor/role.test.ts src/core/roles/innkeeper/role.test.ts` failed because the resolution had no `note`.
- GREEN: both role suites pass (8 tests) and `node --test src/core/engine/bmr.test.ts` passes (205 tests).

## Game-end chronicle

- [x] Extract the log mapping into `src/ui/screens/table/log.tsx` and reuse it in `SidePanel`.
- [x] Render the chronicle in `OverCard` under the review table.
- [x] Add the `game-end-chronicle` browser case.

- GREEN: `PG_BROWSER_CHECK=game-end-chronicle` passed, showing the saved lines and the winner line at 390 px.
- GREEN: `PG_BROWSER_CHECK=journal-pairs` and `PG_BROWSER_CHECK=queue-panel` passed after the extraction.

## Undo and redo

- [x] Clear redo only for an undoable outcome or a history reset.
- [x] Add the record-only and winner store tests.

- RED: `node --test --test-name-pattern="record-only command keeps" src/application/store/create-game-store.test.ts` failed with `false !== true` on `canRedo()` after `setNotes`.
- GREEN: the same test and `undo and redo cross the winning command` pass.

## Verification

- [x] `npm test` — 1599 passed.
- [x] `npm run typecheck`.
- [x] `npm run build`.
- [x] `node scripts/check-types-policy.ts`.
- [x] `node scripts/openspec-check.ts` and `openspec validate --changes --strict`.
- [ ] `npm run verify` on the final branch.
