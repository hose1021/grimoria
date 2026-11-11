# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add the Fool first-death test: an ability death prevented, the ability spent, a second death real, a first execution prevented.
- [x] 1.2 Add the Courtier test: the chosen character drunk for three nights and three days, healthy on the fourth night, and no second step.
- [x] 1.3 Add the Innkeeper test: both targets safe tonight, one recipient drunk until dusk, both effects gone at the next dusk.
- [x] 1.4 Add the Sailor drunk-recipient test: another player and the Sailor themself, each expiring at dusk.
- [x] 1.5 Add the Gambler test: wrong guess kills, correct guess is harmless, an impaired wrong guess is harmless.
- [x] 1.6 Add the Godfather tests: first-night Outsider list and the other-night kill only after an Outsider died today.
- [x] 1.7 Add the Shabaloth test: no first-night wake, two kills, stored targets, and a regurgitation on the next night.
- [x] 1.8 Add the Moonchild next-night tests: the good target dies, the evil target survives.
- [x] 1.9 Add the Professor tests: a dead Outsider is not resurrected even through the outcome controls, and the ability is once per game.
- [x] 1.10 Record the RED command and the failing assertions in the Evidence section.

## 2. GREEN: minimum engine fixes

- [x] 2.1 Let a dead Moonchild complete its next-night step and copy the stored public choice onto the step.
- [x] 2.2 Skip the Gambler's wrong-guess death while the Gambler is impaired.
- [x] 2.3 Apply the Professor's Townsfolk check in `recordBmrOutcome`.
- [x] 2.4 Keep every Storyteller choice explicit: Courtier character, Innkeeper pair and drunk recipient, Gambler guess, Sailor recipient, Shabaloth targets and regurgitation, Godfather target, Moonchild target.

## 3. Documentation

- [x] 3.1 Move the Courtier, Innkeeper, Gambler, Sailor drunk recipient, Shabaloth, Godfather information and kill, Moonchild next-night, Professor role-check and once-per-game, and Fool rows to `verified` with test references.
- [x] 3.2 Update the Courtier and Sailor known-limit wording in `docs/rules-sources.md`.

## 4. Review fixes

- [x] 4.1 Moonchild: the recorded public choice is authoritative. A completion without a target reuses it; a different target is rejected with `error.51` and leaves the state unchanged. Tests: the good target completes without a target, the mismatched target is rejected.
- [x] 4.2 Shabaloth: the outcome controls may only resurrect a player from the previous night's stored targets. A different dead player is rejected with `error.51`. Test: `[2,4]` stored, `resurrectId: "5"` rejected.
- [x] 4.3 Professor: the outcome only repeats the step's chosen target after a completed, unimpaired step; a standalone outcome and a second resurrection in the same use are rejected. Test: standalone, second target `3`, and the impaired case.
- [x] 4.4 Professor: the step and the outcome are gated on `!isImpaired`. Test: a poisoned Professor resurrects nobody.
- [x] 4.5 Correct the matrix citations after the new tests.
- [x] 4.6 Note: PR #98 replaces the dead-actor guard in `completeStep` with a `DEATH_TRIGGERED` map. This change keeps the local exemption for the Moonchild; rebase #98 over it rather than pre-merging that refactor here.

## 5. Verification

- [x] 5.1 Run the full BMR suite and record the count.
- [x] 5.2 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 5.3 Report RED and GREEN evidence on the pull request; do not merge.

## Evidence

- RED: `node --test --test-name-pattern="Fool's first death|Courtier makes|Innkeeper protects|Sailor makes|Gambler dies|Godfather learns|Godfather kills|Shabaloth kills|Moonchild kills|Moonchild does not|Professor resurrects|Professor ability" js/bmr.test.mjs` -> 13 tests, 9 pass, 4 fail. Failing: the impaired Gambler still killed on a wrong guess; the Moonchild step carried no target and `completeStep` returned `error.38` for the dead actor; the evil-target Moonchild completion failed; the Professor resurrected an Outsider through `recordBmrOutcome`. The original Shabaloth failure was a fixture error (its target was the Sailor, who cannot die); the fixture was corrected before this count, so it is not one of the four.
- GREEN: the same command -> 13 tests, 13 pass, 0 fail.
- RED (review): `node --test --test-name-pattern="Shabaloth kills|Moonchild kills|Moonchild does not|Moonchild rejects|Professor resurrects|Professor ability|impaired Professor" js/bmr.test.mjs` against the pre-review engine -> 8 tests, 1 pass, 7 fail (the unchanged pre-existing Professor test passed).
- GREEN (review): the same command -> 8 tests, 8 pass.
