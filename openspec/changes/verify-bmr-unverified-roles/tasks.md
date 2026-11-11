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

## 4. Verification

- [x] 4.1 Run the full BMR suite and record the count.
- [x] 4.2 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 4.3 Report RED and GREEN evidence on the pull request; do not merge.

## Evidence

- RED: `node --test --test-name-pattern="Fool's first death|Courtier makes|Innkeeper protects|Sailor makes|Gambler dies|Godfather learns|Godfather kills|Shabaloth kills|Moonchild kills|Moonchild does not|Professor resurrects|Professor ability" js/bmr.test.mjs` -> 13 tests, 8 pass, 5 fail. Failing: the impaired Gambler still killed on a wrong guess; the Shabaloth fixture chose the Sailor, who cannot die (test fixture error, corrected; no engine change needed); the Moonchild step carried no target and `completeStep` returned `error.38` for the dead actor; the evil-target Moonchild completion failed; the Professor resurrected an Outsider through `recordBmrOutcome`.
- GREEN: the same command -> 13 tests, 13 pass, 0 fail.
- MUTATION-RED: the Moonchild dead-actor exemption, the Gambler impairment check and the Professor outcome check are each covered by a failing assertion in the RED run.
