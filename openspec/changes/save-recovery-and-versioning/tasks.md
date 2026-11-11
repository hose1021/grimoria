# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add a pure step-draft module test: persist a draft for a mid-night step, create a second store from the same storage (reload) and assert the same current step and the same targets/registrations. Verify with `node --test src/ui/screens/table/step-draft.test.ts`; it must fail because the module does not exist.
- [x] 1.2 Add a store test where a v3 and a v2 save each migrate once and a second store from the migrated value returns the same validated state without a write; assert `validateState` returns no errors. Verify with `node --test src/application/store/create-game-store.test.ts`; it must fail.
- [x] 1.3 Add a store test that dispatches a prepared command, reloads, dispatches the same prepared command and asserts `idempotent`, no new write and one application. Verify with the same command; it must fail.
- [x] 1.4 Add a store test where an invalid save is backed up: assert `loadStatus.ok === false`, the error names the backup key, the raw value stays on disk, and a fresh v4 game loads. Verify with the same command; it must fail.
- [x] 1.5 Record the RED command and the observed failures in the Evidence section before implementation.

## 2. GREEN: draft recovery

- [x] 2.1 Add `src/ui/screens/table/step-draft.ts` with `STEP_DRAFT_KEY`, `StepDraft`, `serializeStepDraft`, `parseStepDraft`, `readStepDraft(read, draftKey)` and `writeStepDraft(write, draft)`.
- [x] 2.2 Initialise the `useTableDrafts` maps from the restored record and read it once in `TableScreen` with the current step key.
- [x] 2.3 Persist the current step's draft from `StepCard` whenever its values change. Verify task 1.1 passes.

## 3. GREEN: save audit

- [x] 3.1 Import `STORAGE_KEY`, `LEGACY_KEY` and `LEGACY_V2_KEY` in `local-game-storage.ts` instead of repeating the key literals; no behavior change.
- [x] 3.2 Keep the existing corrupt backup and migration paths; fix only what the new tests show as a gap. Verify tasks 1.2–1.4 pass.

## 4. REFACTOR

- [x] 4.1 Check for dead branches, stale comments and unused imports in the new module and the touched console files.
- [x] 4.2 Rerun the full suite after cleanup.

## 5. Verification and documentation

- [x] 5.1 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 5.2 Report the RED and GREEN evidence, changed paths and test counts on the pull request; do not merge.

## Evidence

- RED: `node --test src/ui/screens/table/step-draft.test.ts` -> `ERR_MODULE_NOT_FOUND` for `./step-draft.ts`; the draft restoration path is absent.
- RED: `node --test src/application/store/create-game-store.test.ts` -> 16 pass, 1 fail: "a command applied before a reload is not applied twice after it"
  failed with `actual: undefined, expected: true` on `repeated.idempotent`. The saved `setOrder` state carried seats that no longer matched
  `order`, so `importGame` rejected its own save and the reload started a fresh game without the applied-command ledger.
- The migration-idempotence and corrupt-backup tests passed from the start: they pin behavior the store already implements (`load()` migrates a
  legacy fallback once and `fresh()` backs up a corrupt value). No test was weakened; the migration test additionally asserts validation, the
  single write and the unchanged text on the second load.
- GREEN: `node --test src/ui/screens/table/step-draft.test.ts src/application/store/create-game-store.test.ts` -> 20 tests, 20 pass.
- FULL: `npm test` -> 345 tests, 345 pass; `npm run verify`, `node scripts/openspec-check.mjs`,
  `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check` all pass.
