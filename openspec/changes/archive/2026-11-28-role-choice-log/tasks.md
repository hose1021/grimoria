# Tasks

## Engine

- [x] Add `actorId` and `targetIds` to `LogInput` and `LogEntry`.
- [x] Fill them in `finishStep` and `finishAttackStep`.
- [x] Give the Courtier a concrete note with the character and the drunk players.
- [x] Gate the new log fields and notes by the ruleset version.
- [x] Update the exact log expectations in `bmr.test.ts`, `engine.test.ts` and `snv.test.ts`.

- RED: `node --test src/core/engine/bmr.test.ts src/core/engine/engine.test.ts src/core/engine/snv.test.ts` failed 28 exact log assertions on the added `actorId`/`targetIds`.
- RED: `node --test --test-name-pattern="a journal recorded while the Tinker" src/core/engine/bmr.test.ts` failed after the Courtier note changed: an older journal replayed with the new note.
- GREEN: the three suites pass (766 tests) after the expectations and the version gate; `npm test` passes 1600 tests.

## Chronicle

- [x] Render the actor and targets in `GameLog` with `ui.logChoice` in ru, en and az.
- [x] Extend the `game-end-chronicle` browser case with a choice line.

- GREEN: `PG_BROWSER_CHECK=game-end-chronicle` passed with the `P1 → P2` line.

## Verification

- [x] `npm test` — 1600 passed.
- [x] `npm run typecheck`.
- [x] `node scripts/verification/test-index.ts` and `npm run verification:build`.
- [x] `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=verified` and `--scope=findings`.
- [x] `npm run verify`.
- [x] `node scripts/openspec-check.ts` and `openspec validate --changes --strict`.
