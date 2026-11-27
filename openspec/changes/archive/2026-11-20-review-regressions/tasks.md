# Tasks

- [x] Read repository guidance and pinned rule sources; record compliant scope.
- [x] Reproduce all five failures on `ff0bfdb` and establish the passing baseline.
- [x] Add RED regressions for malformed effects and journal bases.
- [x] Fix validation and prove recovery/rejection/undo regressions GREEN.
- [x] Add RED browser regressions for saved pools and BMR/S&V corrections.
- [x] Fix both UI paths and prove browser regressions GREEN.
- [x] Add a RED madness preview/apply/replay regression.
- [x] Forward execution context and prove deterministic records GREEN.
- [x] Run full verification, script tests, OpenSpec validation and browser checks.
- [x] Review the final diff and record exact delivery state.

## Evidence

- Baseline: `npm run verify` passed on `ff0bfdb` (732 tests); `node --test
  scripts/*.test.ts` passed 107 tests.
- Sources: `node scripts/check-official.ts` passed 82 entries;
  `node scripts/build-official-roles.ts --check` passed 72 roles and 3 scenarios.
- RED: `node --test --test-name-pattern='malformed effect|journal base|schema v4 saves' src/core/model/state.test.ts src/application/store/create-game-store.test.ts`
  failed six regressions and passed the compatibility case: effects threw and
  invalid journal bases were accepted. Log: `/private/tmp/grimoria-save-validation-red.log`.
- GREEN: the same focused save command passed all seven tests. The model/store
  suite passed 112 tests, including typed cyclic-effect import errors.
- RED: `node --test --test-name-pattern='madness executions preserve command time' src/core/engine/snv.test.ts`
  failed because the death used ambient time instead of the command timestamp.
- GREEN: the same madness command passed four Cerenovus/Mutant day/night cases
  within one test; the S&V, commands and journal suites passed 192 tests.
- RED: with Node 24.22.3 and Playwright 1.65.0,
  `PG_BROWSER_CHECK=saved-custom-bag node scripts/browser-check.ts` failed
  because the saved Chef/pool was not restored, and
  `PG_BROWSER_CHECK=role-corrections node scripts/browser-check.ts` failed
  because the BMR dropdown contained Trouble Brewing roles.
- GREEN: both focused browser checks passed after their fixes, including
  persisted state after reload. `PG_BROWSER_CHECK=madness-execution node
  scripts/browser-check.ts` also passed a real S&V Storyteller execution and
  verified both timestamps against the journal command.
- Compatibility: the full suite exposed the existing no-action-ledger legacy
  test failing stricter base validation. The journal writer now initializes
  the cloned base ledger. The existing test retains its assertions and also
  verifies valid, equivalent replay; all 740 Node 24 tests pass.
- Test tools live outside the repository. Browser commands set
  `PLAYWRIGHT_MODULE` to the external Playwright ESM entry and
  `PLAYWRIGHT_BROWSERS_PATH` to its downloaded browser directory.
- Final GREEN on Node 24.22.3: `npm run verify` passed typechecks, lint,
  formatting, 740 tests, production build, fallback/worker generation, source
  policy, official provenance, acceptance and ownership checks. Log:
  `/private/tmp/grimoria-fixes-verify.log`.
- `node --test scripts/*.test.ts` passed all 107 tooling tests.
- OpenSpec 1.16.1: `openspec validate --changes --strict` passed 31 changes;
  `openspec validate --specs --strict` passed 24 specs;
  `node scripts/openspec-check.ts` passed.
- Full Playwright 1.65.0 `node scripts/browser-check.ts` passed, including
  existing offline/update/privacy coverage, all three new browser regressions,
  and saved-bag/correction checks at 390 px and 1280 px. Phone screenshots were
  visually reviewed. Log: `/private/tmp/grimoria-fixes-browser.log`.
- Production build smoke: `/bag` and `/table` at `http://localhost:8010/`,
  390 px viewport, no horizontal overflow or console/page errors. The build
  includes the generated service worker; the development server does not.
- Full-game validation: test build with `BASE_PATH=/pocket/`, generated
  fallback/worker, then `node scripts/run-scenarios.ts` passed 10/10 scenarios.
  Log: `/private/tmp/grimoria-fixes-scenarios.log`.
- Final diff: only the five fixes, the legacy ledger compatibility adjustment,
  asserting regression coverage and this OpenSpec change. `git diff --check`
  passed. No dependency, schema or source-pin changes.
- Delivery: local branch `fix/review-regressions`, commit message
  `fix: address save, setup and replay regressions`. No upstream issue is
  closed and no branch is merged.
