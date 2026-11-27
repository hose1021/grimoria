# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add the Vigormortis tests: a killed Minion keeps its step while a living, unimpaired Vigormortis exists; the step disappears when the Vigormortis dies or is impaired; one Townsfolk neighbour is poisoned and the host may name another legal neighbour.
- [x] 1.2 Add the Vortox false-information tests: a Townsfolk information step with a living, unimpaired Vortox demands a host answer and refuses to complete without one; an impaired actor does the same; an unimpaired actor with no Vortox completes with the computed answer.
- [x] 1.3 Add the Oracle test: the answer counts dead evil players, not death events (a resurrected evil player is not counted).
- [x] 1.4 Add the Seamstress tests: same and different alignment answers, the once-per-game limit, and the rejection of a self, repeated or missing target pair.
- [x] 1.5 Add the Flowergirl and Town Crier tests: a true answer when the ended day had a Demon vote or Minion nomination, a false answer otherwise.
- [x] 1.6 Add the Juggler tests: day-one guesses create the night step; the answer is the number of matching characters; no guesses means no step; a sixth guess or a later-day guess is rejected.
- [x] 1.7 Add the Klutz tests: an opposing-team choice wins with reason `klutz`, a same-team choice does not, and a dead or missing target is rejected.
- [x] 1.8 Add the Sage condition test (demon kill only) and the Sweetheart permanent drunk test.
- [x] 1.9 Add the Dreamer self-target rejection test.
- [x] 1.10 Add the full Sects & Violets game run from setup through several nights and days to a winner.
- [x] 1.11 Record the RED command and the failing assertions in the Evidence section.

## 2. GREEN: engine implementation

- [x] 2.1 Add `state.juggler` and `state.lastDay` to the model with defaults, and capture the ended day in `endDay`.
- [x] 2.2 Add the `jugglerGuess` command to the contracts, the registry and the engine, limited to day one and five targets.
- [x] 2.3 Compute the Oracle, Seamstress, Flowergirl, Town Crier and Juggler answers in `svInfoForStep`.
- [x] 2.4 Require a host answer when the actor is impaired or a living, unimpaired Vortox is in play, in both the info result and `completeStep`.
- [x] 2.5 Implement the Vigormortis minion retention and neighbour poison, with the host override and the reconcile.
- [x] 2.6 Append the Klutz step, enforce its living target and set the win in the engine.
- [x] 2.7 Enforce the Seamstress two-distinct-players rule before spending the ability.
- [x] 2.8 Keep the Mathematician an explicit host choice.

## 3. Console and strings

- [x] 3.1 Add the Juggler day panel with a target and character select, wired to `jugglerGuess`.
- [x] 3.2 Add the Russian, English and Azerbaijani strings used by the panel.

## 4. Documentation

- [x] 4.1 Move the Vigormortis minion and neighbour poison, Vortox false information, Juggler, Oracle, Seamstress, Flowergirl, Town Crier, Sage, Sweetheart and Klutz rows to `verified` or an explicit `host-choice` with the host's allowed options.
- [x] 4.2 Update the Sects & Violets known-limit wording in `docs/rules-sources.md`.

## 5. Verification

- [x] 5.1 Run the full Sects & Violets suite and record the count.
- [x] 5.2 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 5.3 Report RED and GREEN evidence on the pull request; do not merge.

## Evidence

- RED: `node --test js/snv.test.mjs` with the plumbing missing -> `SyntaxError: The requested module './engine.js' does not provide an export named 'jugglerGuess'` (0 tests ran; the module failed to link).
- RED: `node --test js/snv.test.mjs` after the state, command and export plumbing -> 67 tests, 53 pass, 14 fail. Failing: the Vigormortis minion retention/poison (3), the Vortox/impaired host answer (3), the Seamstress alignment and target checks (2), the Flowergirl/Town Crier answers (2), the Juggler count and limits (1), the Klutz loss and validation (2), and the full Sects and Violets run (1: the Juggler had no step because `stepAllowed` still required an unset marker).
- GREEN: `node --test js/snv.test.mjs` -> 74 tests, 74 pass, 0 fail.
- GREEN: `npm test` -> 365 tests, 365 pass, 0 fail.
- RED (review 1): against the pre-review engine `8c8d04b`, the three blockers reproduce: the Vigormortis-killed Evil Twin gives no winner when the good twin is executed (`null` instead of `evil-twin`); an evil Klutz choosing an evil player gives no winner; the Vigormortis poison stays `active: true` and the target impaired after `replaceCharacter` turns the dead Minion into an Oracle.
- GREEN (review 1): the new Evil Twin, evil-Klutz, poison-source, missing-day and state-validation tests pass; `node --test js/snv.test.mjs` -> 74 tests, 74 pass.
- GREEN: `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check` pass.
