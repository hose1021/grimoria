# Tasks

## 1. Swap rule

- [x] 1.1 Add `src/core/model/bag-swap.test.ts` for same-type legal
      candidates, the Outsider modifiers, bluff and Drunk-mask repair, the
      Lunatic and the Evil Twin.
- RED: `node --test src/core/model/bag-swap.test.ts` failed: "The requested
  module './rules.ts' does not provide an export named 'swapBagRole'".
- GREEN: the same command passes 5 of 5 after `swapCandidates` and
  `swapBagRole` were added.

## 2. Random tab and role grid

- [x] 2.1 Add the `random-swap` browser check: grouped rolled roles, the
      Godfather not offered for 8 players without a spare Outsider, a swap that
      refills bluffs and closes the list, undo, the team check on every picked
      card, localized title and team names in RU, AZ and EN, no overflow at
      390 px.
- RED: `PG_BROWSER_CHECK=random-swap node scripts/browser-check.ts` on the
  old screen failed: "every rolled role is listed".
- GREEN: the same command passes on the new screen.
- [x] 2.2 Verify: `npm run verify`.
