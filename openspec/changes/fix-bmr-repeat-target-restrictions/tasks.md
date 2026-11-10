# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add a BMR test where the Devil's Advocate chooses A on night 1 and A again on night 2; assert `error.50`, an incomplete step and an unchanged state. Verify with `node --test --test-name-pattern="Devil's Advocate cannot choose the same target" js/bmr.test.mjs`; it failed on `previousTarget === undefined`.
- [x] 1.2 Add a BMR test where the Exorcist chooses A on one night and A again on the next; assert `error.50` and no skipped Demon wake. The RED run failed because the repeat was allowed (`true !== false`).
- [x] 1.3 Add a command-level assertion that a repeat target from `applyCommand` is rejected and `canonicalState` is byte-identical before and after.
- [x] 1.4 Record the RED command and the failing assertions in the Evidence section.

## 2. GREEN: validation and target storage

- [x] 2.1 Project `previousTarget` in `makeBmrStep` only when the stored night is the immediately preceding night.
- [x] 2.2 Store `actor.used.devilsadvocateTarget` and `devilsadvocateTargetNight` when the Devil's Advocate step completes.
- [x] 2.3 Reject a repeated `previousTarget` in the shared BMR validation in `completeStep` with `error.50`; leave the draft untouched.
- [x] 2.4 Add `error.50` to `js/locales/{ru,en,az}.js`.

## 3. REFACTOR

- [x] 3.1 Confirm the UI disables `previousTarget` from the step projection; no separate role list remains.
- [x] 3.2 Remove duplicated role-specific previous-target lookup code.

## 5. Follow-up: consecutive-night gap

- [x] 5.1 RED: add tests where the Devil's Advocate and Exorcist choose A, make no choice on the next night, and choose A again on the night after. Verify with `node --test --test-name-pattern="may repeat a target after a skipped night" js/bmr.test.mjs`; 2 tests failed because `previousTarget` still held A.
- [x] 5.2 RED: add tests for a dead and resurrected Devil's Advocate, a role change away and back, and a legacy save without a night marker. The targeted RED run failed 5 of 5.
- [x] 5.3 GREEN: store `TargetNight` with each choice and set `previousTarget` only when `TargetNight === current night - 1`. Verify the targeted tests pass.
- [x] 5.4 Lock the impaired case: a choice made while drunk still consumes the previous target for the next consecutive night.

## 6. Verification and documentation

- [x] 6.1 Run `node --test js/*.test.mjs` and record the pass count.
- [x] 6.2 Run `node scripts/build-offline.mjs` and record the new cache id.
- [x] 6.3 Update the two restriction rows in `docs/rules-matrix.md` and the baseline counts.
- [x] 6.4 Run `openspec validate --changes --strict`, `openspec validate --specs --strict` and `node scripts/openspec-check.mjs`.
- [x] 6.5 Smoke the BMR night route in a browser, including the disabled previous target. Pull-request CI ran `scripts/browser-check.mjs` and passed; the local checkout has no Playwright install.
- [x] 6.6 Report RED and GREEN evidence on the pull request; do not merge.

## Evidence

- RED: `node --test --test-name-pattern="cannot choose the same target" js/bmr.test.mjs` -> 2 tests, 2 fail. Devil's Advocate: `previousTarget` was `undefined`. Exorcist: the repeat target was accepted (`true !== false`).
- GREEN: the same command -> 2 tests, 2 pass.
- RED (follow-up): `node --test --test-name-pattern="repeat a target|resurrected Devil|left play|legacy target" js/bmr.test.mjs` -> 5 tests, 5 fail. Every case kept `previousTarget` from the last actual choice.
- GREEN (follow-up): the targeted repeat tests -> 7 pass, including the two original consecutive-night tests and the impaired-choice lock.
- Full suite: `node --test js/*.test.mjs` -> 209 tests, 209 pass, 0 fail.
- OpenSpec: `openspec validate --changes --strict` and `openspec validate --specs --strict` pass; `node scripts/openspec-check.mjs` reports 10 specs and 3 active changes.
- Offline worker: `node scripts/build-offline.mjs` -> cache `d89eb122995cfd21`, 424 assets.
- CI (PR #47, run 42830967248): Unit tests pass, Playwright regression checks pass, Specifications pass, Branch and pull request title pass.
