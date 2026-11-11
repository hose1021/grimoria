# Tasks

## 1. RED: failing tests per behaviour

- [x] 1.1 Add the Goon test: the first chooser is drunk until the next dusk, the Goon takes their alignment, a later chooser in the same night changes nothing, and the drunk ends at the next dusk.
- [x] 1.2 Add the impaired Goon test: a drunk or poisoned Goon grants no drunk and no alignment change.
- [x] 1.3 Add the Lunatic test: the setup stores the shown Demon and keeps the player good, the night-one Demon information names the Lunatic, the choice kills no one, the completed Demon info keeps `lunaticId`, and the Demon step reports the name and last choice.
- [x] 1.4 Add the Mastermind team-loss test: an evil player executed on the extra day loses for evil.
- [x] 1.5 Add the support-status test: the five audited roles report `verified`/`host-choice` with a detail key, and a role outside the audit is not listed.
- [x] 1.6 Add the already-drunk-chooser test: the Goon still changes alignment and the chooser is still drunk.
- [x] 1.7 Add the command-level Pukka, Sailor and Innkeeper tests: `completeNightStep` is accepted and the effect graph stays acyclic.
- [x] 1.8 Add the Chambermaid test: choosing the Goon makes the information a host choice and stores the false result.
- [x] 1.9 Add the Shabaloth test: choosing the Goon records no deaths.
- [x] 1.10 Add the exclusion tests: the Lunatic's simulated choice and the Grandmother's pick do not trigger the Goon.
- [x] 1.11 Record the RED commands and the failing assertions in the Evidence section.

## 2. GREEN: minimum implementation

- [x] 2.1 Make the first chooser drunk immediately, before the ability resolves, via `applyBmrGoonTrigger` in `completeStep`; the chooser's ability applies no effect and the Goon takes their alignment.
- [x] 2.2 Source the granted drunk by the chooser so the chooser's own effects depend on it and stay inactive; preserve the grant through the Sailor and Innkeeper own-effect purges; keep the effect graph acyclic.
- [x] 2.3 Skip the trigger while the Goon is drunk or poisoned; keep it for a chooser who was already drunk or poisoned.
- [x] 2.4 Exclude the Lunatic and Grandmother from the trigger; gate the information preview with `bmrGoonWouldTrigger` and the outcome with `step.goonImpaired`.
- [x] 2.5 Gate the Assassin, Moonchild and Exorcist direct effects on impairment; keep the Assassin's protection bypass explicit.
- [x] 2.6 Add the Lunatic to the night-one Demon information step, set `infoKind: "note"` on Demon role steps while a Lunatic is in play, extend the information result with `lunaticId`, and keep it in the completed system-step `given`.
- [x] 2.7 Add the role support table and `bmrRoleSupport` in the model; render it on the secrets screen, the night step card and the Pacifist execution control from the dealt bag.
- [x] 2.8 Add the ru/en/az strings and update the host warning copy so it no longer claims the Goon is untracked.

## 3. Documentation

- [x] 3.1 Move the Goon and Lunatic matrix rows to `verified` with the new test references; add the Mastermind evil-execution reference.
- [x] 3.2 Correct the Goon row to say an impaired Goon grants nothing and an already-impaired chooser still triggers.
- [x] 3.3 Update the matrix known-limits and unknown-rules lists and the baseline test counts.
- [x] 3.4 Update the Bad Moon Rising implementation model and known limits in `docs/rules-sources.md`.

## 4. Review fixes

- [x] 4.1 Remove the Goon-source/chooser-target cycle: source the granted drunk by the chooser, preserve it through the Sailor/Innkeeper purges, and add command-level Pukka/Sailor/Innkeeper regressions.
- [x] 4.2 Drop the chooser-impairment skip and add the already-drunk-chooser test.
- [x] 4.3 Resolve the chooser's ability as impaired: apply the trigger before the ability, gate the outcome and information, add the Chambermaid and Shabaloth tests, and delete the "choice still resolves" claim.
- [x] 4.4 Exclude the Lunatic and Grandmother with the `NO_GOON_CHOICE` per-step signal and tests.
- [x] 4.5 Use one living-Lunatic predicate for the Demon info and the report.
- [x] 4.6 Use the dealt bag for the Pacifist support block.
- [x] 4.7 Assassin -> Goon: mark `goonImpairedOnly`, exempt the Assassin's kill and outcome, add the test and the matrix/source exception.
- [x] 4.8 Moonchild -> Goon: exempt the stored choice at its bookkeeping wake, add the test and correct the design risk.

## 5. Verification

- [x] 5.1 Run the full BMR suite and record the count.
- [x] 5.2 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 5.3 Report RED and GREEN evidence on the pull request; do not merge.

## Evidence

- RED: (first round) `node --test --test-name-pattern="Goon|Lunatic|Mastermind|support table" js/bmr.test.mjs` with `src/core/engine/bmr.ts` and `src/core/engine/information.ts` stashed (the support table stayed in `rules.ts`, so the file still loads) -> 6 tests, 4 pass, 2 fail. Failing: the Goon stayed `good` after the Demon chose it and no drunk was granted; the night-one Demon information had no `lunaticId` and the Demon step had no Lunatic note. The impaired-Goon test passed trivially (no trigger existed), and the Mastermind evil-execution and support-table tests verify behavior/data that already existed; they are regression locks.
- GREEN: (first round) the same command -> 6 tests, 6 pass, 0 fail.
- RED (review): (pre-rebase tree) `node --test --test-name-pattern="Goon|Lunatic|Mastermind|support table|Chambermaid|Shabaloth|Grandmother|Pukka choosing|Sailor choosing|Innkeeper choosing" js/bmr.test.mjs` with the pre-review `bmr.ts` and `night.ts` -> 19 tests, 11 pass, 8 fail. The three Pukka/Sailor/Innkeeper tests are rejected with `CYCLIC_EFFECT_DEPENDENCY`; the already-drunk chooser, Chambermaid, Shabaloth, Lunatic and Grandmother tests also fail.
- GREEN (review): the same command on the rebased tree -> 20 tests, 20 pass, 0 fail (the extra match is the upstream Pukka repeat-target test).
- RED (review 2): `node --test --test-name-pattern="the Assassin kills the Goon|the Moonchild's stored choice" js/bmr.test.mjs` against the pre-fix engine -> 2 tests, 0 pass, 2 fail: the Assassin's and Moonchild's Goons both stayed alive.
- GREEN (review 2): the same command -> 2 tests, 2 pass, 0 fail.
- GREEN (suite): `node --test js/bmr.test.mjs` -> 81 tests, 81 pass, 0 fail.
- GREEN (full): `npm test` -> 370 tests, 370 pass, 0 fail.
