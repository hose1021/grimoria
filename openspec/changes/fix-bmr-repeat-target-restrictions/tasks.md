# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add a BMR test where the Devil's Advocate chooses A on night 1 and A again on night 2; assert `error.50`, an incomplete step and an unchanged state. Verify with `node --test --test-name-pattern="Devil's Advocate cannot choose the same target" js/bmr.test.mjs`; it failed on `previousTarget === undefined`.
- [x] 1.2 Add a BMR test where the Exorcist chooses A on one night and A again on the next; assert `error.50` and no skipped Demon wake. The RED run failed because the repeat was allowed (`true !== false`).
- [x] 1.3 Add a command-level assertion that a repeat target from `applyCommand` is rejected and `canonicalState` is byte-identical before and after.
- [x] 1.4 Record the RED command and the failing assertions in the Evidence section.

## 2. GREEN: validation and target storage

- [x] 2.1 Generalize `previousTarget` in `makeBmrStep` for every role that stores `<roleId>Target` in `actor.used`.
- [x] 2.2 Store `actor.used.devilsadvocateTarget` when the Devil's Advocate step completes.
- [x] 2.3 Reject a repeated `previousTarget` in the shared BMR validation in `completeStep` with `error.50`; leave the draft untouched.
- [x] 2.4 Add `error.50` to `js/locales/{ru,en,az}.js`.

## 3. REFACTOR

- [x] 3.1 Confirm the UI disables `previousTarget` from the step projection; no separate role list remains.
- [x] 3.2 Remove duplicated role-specific previous-target lookup code.

## 4. Verification and documentation

- [x] 4.1 Run `node --test js/*.test.mjs` and record the pass count.
- [x] 4.2 Run `node scripts/build-offline.mjs` and record the new cache id.
- [x] 4.3 Update the two `unsupported` rows in `docs/rules-matrix.md` to `verified` with the new tests.
- [x] 4.4 Run `openspec validate --changes --strict`, `openspec validate --specs --strict` and `node scripts/openspec-check.mjs`.
- [ ] 4.5 Smoke the BMR night route in a browser, including the disabled previous target. Not run locally: Playwright is not installed in this checkout; pull-request CI runs `scripts/browser-check.mjs`.
- [x] 4.6 Report RED and GREEN evidence on the pull request; do not merge.

## Evidence

- RED: `node --test --test-name-pattern="cannot choose the same target" js/bmr.test.mjs` -> 2 tests, 2 fail. Devil's Advocate: `previousTarget` was `undefined`. Exorcist: the repeat target was accepted (`true !== false`).
- GREEN: the same command -> 2 tests, 2 pass.
- Full suite: `node --test js/*.test.mjs` -> 203 tests, 203 pass, 0 fail.
- OpenSpec: `openspec validate --changes --strict` and `openspec validate --specs --strict` pass; `node scripts/openspec-check.mjs` reports 10 specs and 3 active changes.
- Offline worker: `node scripts/build-offline.mjs` -> cache `d573a21573cd849d`, 424 assets.
