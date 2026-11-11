# Tasks

## 1. Specification and RED tests

- [x] 1.1 Add S&V scenarios for blocking end of day until every active madness effect has a recorded review, and allowing a late execute upgrade after a no-penalty review.
- [x] 1.2 Add an application projection test for pending/reviewed madness entries.
- [x] 1.3 Run the focused engine tests before implementation and record the RED output.
- [x] 1.4 Cover one player affected by overlapping Cerenovus and Mutant madness.

## 2. Engine

- [x] 2.1 Add the shared query for active madness reviews due on the current day.
- [x] 2.2 Reject `endDay` atomically while a review remains due.
- [x] 2.3 Permit only a same-day `none` to `execute` upgrade; preserve idempotency and the one-execution rule.
- [x] 2.4 Address each review by effect ID so overlapping conditions are decided independently.

## 3. Storyteller screen

- [x] 3.1 Project active and pending madness for the day card.
- [x] 3.2 Add the explicit review controls and localized guidance in ru/en/az.
- [x] 3.3 Extend browser checks for the reminder, the blocked transition and successful review.

## 4. Verification

- [x] 4.1 Run focused RED/GREEN tests and record commands/results.
- [x] 4.2 Run `npm run typecheck`, `npm test`, `npm run verify`, `node scripts/browser-check.mjs` and OpenSpec checks.
- [x] 4.3 Smoke `/table` at desktop and 390 px; run `git diff --check`.

## Evidence

- RED: `node --test js/snv.test.mjs` failed in the original review-gate and same-day-upgrade tests.
- RED after the source migration: `npm test` found the seeded S&V acceptance flow could leave `endDay` blocked when a Mutant was also chosen by the Cerenovus; one command had been marking only one of the player's two effects.
- GREEN: `node --test --test-name-pattern='overlapping madness condition|prepared snv game' src/core/engine/snv.test.ts src/core/engine/acceptance.test.ts` passes 2/2; each review now names its effect ID.
- GREEN: `npm test` passes 476/476, including the review gate, overlapping reviews, daily Mutant reminder, same-day upgrade, host-only projection and all three locale catalogs.
- GREEN: `node scripts/browser-check.mjs` passes, including the blocked transition preview, visible madness condition, recorded reason and day completion after review.
- GREEN: `npm run verify` passes; final total after merging `origin/main` is 476 tests.
- GREEN: `openspec validate --changes --strict`, `openspec validate --specs --strict`, `node scripts/openspec-check.mjs` and `git diff --check` pass.
- CI: the first GitHub OpenSpec run rejected missing PR metadata; the description now includes `Issue: #19` and `OpenSpec change: 2026-11-12-madness-review`.
