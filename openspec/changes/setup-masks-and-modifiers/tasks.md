# Tasks

## 1. Red tests

- [x] 1.1 Add `js/setup.test.mjs`: every count 5–15 in all three scenarios, the
  composition table, each modifier and its impossible choice, every bag
  rejection code, the Drunk and Lunatic mask exclusion from bluffs and the
  public view, and the script limits. Add a BMR Lunatic step test asserting the
  stored target and the Demon's note.
- [x] 1.2 Run the new file against the reviewed engine and record the failure.

## 2. Lunatic mask and script limits

- [x] 2.1 Validate `lunaticShownId` in `bagErrors`: required when the Lunatic is
  in play, a Demon, inside the selected script, and unused without a Lunatic.
- [x] 2.2 Reject the Lunatic mask as a bluff with `bluffs-lunatic`.
- [x] 2.3 Pass the state mask from `setupErrors` and derive it in `randomBag`,
  `presetBag`, custom suggestions and `repairBag`.
- [x] 2.4 Supply the in-play Demon as the mask in the BMR test fixture.

## 3. Verification

- [x] 3.1 Run the new file and the whole suite; record the GREEN counts.
- [x] 3.2 Run format, typecheck, lint, the OpenSpec checks and
  `git diff --check`.
- [x] 3.3 Update `docs/rules-matrix.md` (Lunatic row to `verified`, setup rows
  and counts) and `docs/rules-sources.md` (mask rule).
- [x] 3.4 Commit, report and stop; the owner merges.

## Evidence

- RED: `node --test js/setup.test.mjs` against the reviewed engine produced
  `tests 7`, `pass 5`, `fail 2`: `✖ illegal bags are rejected with a stable
  reason` — `AssertionError [ERR_ASSERTION]: lunatic-shown: []` (the validator
  returned no error for a Lunatic without a mask), and `✖ the Drunk and Lunatic
  masks never become bluffs or public information` — the Lunatic bluff produced
  only `bluffs-team` and `bluffs-inplay`, no `bluffs-lunatic`.
- GREEN: the same command produced `tests 7`, `pass 7`, `fail 0`.
- GREEN: `npm test` -> 347 tests, 347 pass, 0 fail (`js` 272, TypeScript 75).

## Review evidence

- The review asked for an asserting test behind the Lunatic row. The Lunatic
  step behaviour already existed, so the new
  `js/bmr.test.mjs` case "the Lunatic's target is reported to the real Demon"
  is a characterization test and passes immediately (`node --test
  --test-name-pattern="Lunatic" js/bmr.test.mjs` -> `tests 1`, `pass 1`,
  `fail 0`); no RED applies. The mask RED above is unchanged.
- The two `bagErrors` calls in `js/bmr.test.mjs` now pass
  `lunaticShownId: bag.lunaticShownId`, so the derived mask is asserted legal in
  the only script that has the Lunatic.
