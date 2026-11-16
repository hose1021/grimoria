# Tasks

## 1. Branch and failing tests

- [x] 1.1 Create the worktree and branch from the current `origin/main`: `git worktree add ../grimoria-lifecycle-phase-guards -b feat/lifecycle-phase-guards origin/main`, then verify `git worktree list` names the worktree and `git branch --show-current` prints `feat/lifecycle-phase-guards`.
- [x] 1.2 Add `src/core/engine/lifecycle.test.ts` with the table-completeness, per-command rejection, full-cycle, atomic-rejection, edition-independence and manual-pool scenarios from `design.md` and the two delta specs; run `node --test src/core/engine/lifecycle.test.ts` and record RED (the module and guards are absent).
- [x] 1.3 Add `src/core/engine/lifecycle.ts` with `PhaseRejection`, `PhasePolicy`, `COMMAND_PHASES` for all 47 command types and `lifecycleGuard`; run `node --test src/core/engine/lifecycle.test.ts` and record GREEN for the table and guard tests.

## 2. Transition and command guards

- [x] 2.1 Guard the setup family in `src/core/engine/setup-commands.ts` and `src/core/engine/setup.ts`: `dealGame`, `startGame`, `claimSeat`, `autoSecrets`, `bagUpdate`, `setOrder`, `setHerring`, `setSetupInfo`, `setSetupInfoZero`, `normalizeSecrets`; restrict `bagUpdate` `patch.phase` to a `resetRoster` reset to `setup`; verify the deal-in-night and bag-patch scenarios pass in `node --test src/core/engine/lifecycle.test.ts`.
- [x] 2.2 Guard the night path in `src/core/engine/night.ts` and `src/core/engine/death.ts`: `startNight` (`deal`, `seat`, `night`), `completeStep`, `skipStep`, `endNight`, `chooseDemonHeir` (`night`); remove the duplicated winner preambles; verify `endNight` in `day` returns `error.78` with an unchanged day and the full-cycle test passes.
- [x] 2.3 Guard the day path in `src/core/engine/day.ts`, `src/core/engine/sv.ts` and `src/core/engine/bmr.ts`: the day actions (`day`), the host records `executeByDecision`, `madnessPenalty`, `recordAbnormal`, `recordKlutzChoice`, `tinkerDeath` (`day` or `night`), `recoverClaim` (all play phases), and `recordBmrOutcome`, `recordSvOutcome`, `resurrectPlayer` (`night`); remove the duplicated winner/day preambles; verify the day-action-at-night and edition-independence scenarios pass.
- [x] 2.4 Add `error.78` and `error.79` to `src/ui/i18n/locales/ru.ts`, `en.ts` and `az.ts`; verify `node --test src/ui/i18n/strings.test.ts` passes and reports no missing engine key.
- [x] 2.5 Verify the existing command suites still pass: `node --test src/core/engine/commands.test.ts src/core/engine/invariants.test.ts`.

## 3. Manual-only boundary

- [x] 3.1 Change `normalizeScript` in `src/core/engine/setup-commands.ts` to reject `manualOnly: true` on a single-edition pool with `error.79`; change `normalizeScriptState` and `validateStateStructure` in `src/core/model/state.ts` to clear a stray legacy flag and reject a conflicting non-mixed script; verify the import, validation and legacy-normalization tests in `node --test src/core/engine/manual.test.ts src/core/model/state.test.ts` pass.
- [x] 3.2 Add the same-edition automatic-resolution regression (non-empty night queue and an automatic win) to `src/core/engine/manual.test.ts`; verify it passes with `node --test src/core/engine/manual.test.ts`.

## 4. Traceability and documentation

- [x] 4.1 Add `SYS-LIFECYCLE-01` and `SYS-LIFECYCLE-02` rows plus a Lifecycle section to `docs/rules-shared.md` and `docs/rules-matrix.md`, and add `SYS-SCRIPTS-10` to the Scripts section; name the exact asserting tests; verify `node scripts/check-acceptance.ts` passes.
- [x] 4.2 Update the lifecycle section of `docs/adr/0002-engine-contracts.md` and the Domain rules bullet in `SPEC.md` to name the policy module, the command matrix and the manual-only boundary; verify both files state the same transitions and error codes as the code.
- [x] 4.3 Run `node scripts/openspec-check.ts` and `openspec validate --changes --strict`; verify both pass.

## 5. Integration verification and delivery

- [x] 5.1 Run `npm run verify` and record the exact result for typecheck, lint, format, tests, build, fallback, offline and policy.
- [x] 5.2 Run `npm run dev`, open `http://localhost:8010/` with a real game, exercise a night end and a day end at ~390 px width, and verify the console is clean and the phase labels update.
- [x] 5.3 Commit the change on `feat/lifecycle-phase-guards`, push the branch, open a PR that names `#215` and this OpenSpec change, report CI, and stop without merging.

## Evidence

- RED: `node --test src/core/engine/lifecycle.test.ts` failed with
  `ERR_MODULE_NOT_FOUND` for `src/core/engine/lifecycle.ts`; after the module
  existed, four handler tests still failed (`endNight` in day, `dealGame` in
  night, bag phase patch, manual-pool end night).
- GREEN: `node --test src/core/engine/lifecycle.test.ts` passed 14/14;
  `node --test src/core/engine/commands.test.ts` passed 52/52;
  `node --test src/core/engine/manual.test.ts src/core/model/state.test.ts`
  passed 26/26; `npm test` passed 780/780 after the secret and seat-order
  correction regressions; `npm run typecheck` passed.
- Fixture note: the new `endNight` and `dealGame` guards exposed three test
  helpers that advanced the lifecycle through an unguarded call. `nextNight`
  and `laterNight` now start or end the required phase, the Klutz command test
  starts the night, and the two re-deal tests assert the play-phase rejection
  before exercising the setup-family reset.
- Traceability: `node scripts/check-acceptance.ts` passed 72 matrix roles and
  15 test files; `node scripts/openspec-check.ts` passed 24 specs and 35
  active changes.
- Integration: `npm run verify` passed all stages (780 tests); the dev server
  at `http://localhost:8010/` ended night 1 into day 1 and then day 1 into
  night 2 at a 390 px viewport, and the browser console reported no errors.
  The `/secrets` herring correction also wrote `setup.herringId` during a
  night without a console error.

## Workflow follow-up

- Archive the change after the owner merge and the required verification.
- Remove the worktree and delete the local branch after the merge.
