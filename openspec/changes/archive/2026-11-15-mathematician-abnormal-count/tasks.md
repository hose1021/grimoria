# Tasks

## 1. Source and contract

- [x] 1.1 Read `Mathematician.r3153`: one ABNORMAL reminder per character whose
  ability worked abnormally because of another ability since dawn; the count is
  characters, not events; poisoning itself is not counted; the reminders are
  removed after the Mathematician wakes.
- [x] 1.2 Add the `abnormal` ledger to `GameState`, initialize it, clear it on a
  new game, and validate it without breaking a save that lacks the field.
- [x] 1.3 Add the `recordAbnormal` command with a typed payload and schema.

## 2. Behavior

- [x] 2.1 `recordAbnormal` rejects a non-game phase, an unknown player, a blank
  reason and a duplicate mark in the same day/night window.
- [x] 2.2 `abnormalCount` counts distinct marked characters in the current
  day/night number and ignores older marks.
- [x] 2.3 `svInfoForStep` returns a number, not a note; an impaired Mathematician
  or a living unimpaired Vortox requires a host number from 0 to the player
  count.
- [x] 2.4 The completed Mathematician step clears the ledger.

## 3. Evidence

- [ ] 3.1 RED: with the command handler absent, the marking and count tests
  fail; GREEN after registration.
- [x] 3.2 Unit tests: marking, duplicate, window, computation, host false
  number, clearing, privacy, invalid input.
- [ ] 3.3 Acceptance: the matrix row is split into verified computation and two
  host-choice rows; `rule.md` matches; the README/support level is unchanged.

## 4. UI

- [x] 4.1 Add the ABNORMAL marking panel to the table menu with a player select,
  a reason field and the current marks.
- [x] 4.2 Add ru/en/az strings and the `error.72` message.

## 5. Verification

- [x] 5.1 `npm run verify`.
- [x] 5.2 `node scripts/check-acceptance.mjs`, `node scripts/openspec-check.mjs`,
  `openspec validate --changes --strict`, `openspec validate --specs --strict`.
- [x] 5.3 Run the app at `/table` during a day and a night, mark one abnormal
  ability, check that the Mathematician step shows the count, and capture the
  panel at desktop and ~390 px.
- [x] 5.4 Cover a mark made during the preceding day at the next wake, the
  skipped/dead wake clearing the window, and the Vortox rejecting the true
  number.

## Evidence

- RED: with the `recordAbnormal` handler removed, `node --test --test-name-pattern="Mathematician|abnormal" src/core/engine/snv.test.ts` failed 2 of 4: the marking/count test and the host-false-number test could not record a mark.
- GREEN: with the handler restored the same command passes 4/4; `npm test` passes 623/623.
- GREEN: `npm run verify` passes (typecheck ×4, lint, format, 623 tests, build, fallback, offline 383 assets, source policy, provenance 82 entries, acceptance 72 roles); `node --test "scripts/*.test.mjs"` → 90/90.
- GREEN: `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` (11/11) and `openspec validate --specs --strict` (24/24) pass.
- GREEN: review fixes cover a mark made during day 1 at the night-2 wake, a skipped/dead wake closing the window, and a healthy Mathematician under a Vortox rejecting the true number while offering a false one.
- GREEN browser: the table menu showed the ABNORMAL panel at 1280 px and 390 px, a mark for P2 was recorded with its reason, the Mathematician step returned a number 1 with no host choice, completing the step cleared the ledger, and the console was clean with no horizontal overflow.
- Pinned source: `docs/official/wiki/Mathematician.r3153.wikitext`.
- The existing "Vortox and impairment make the Dreamer, Sage and Mathematician
  answers false choices" test already covers the false-choice path; this change
  makes the value computed instead of a note.
