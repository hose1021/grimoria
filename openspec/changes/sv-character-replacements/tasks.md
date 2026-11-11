# Tasks

## 1. Red tests

- [x] 1.1 Add eighteen replacement cases to `js/snv.test.mjs`: Pit-Hag change,
  Pit-Hag duplicate rejection, Pit-Hag removal of the Demon, Snake Charmer swap,
  non-Demon and dead targets, evil Snake Charmer, Barber swap, another-Demon
  rejection with a Demon self-swap, the Evil Twin pair, the Philosopher
  borrowed ability, the impaired and declined Philosopher, the Philosopher's own
  character, the drunk entering play later, a former Philosopher, a borrowed
  death-triggered ability and export/import.
- [x] 1.2 Run them against the reviewed engine and record the failure.

## 2. Character changes

- [x] 2.1 Add `replaceCharacter`, `swapCharacters` and the queue recalculator to
  `src/core/engine/sv.ts`; keep the alignment in a Pit-Hag change, swap
  alignments only for the Snake Charmer, and drop the Evil Twin rewrite.
- [x] 2.2 Apply the Pit-Hag, Snake Charmer, Barber and Philosopher abilities in
  `completeSvStep`, returning the rejection through `completeStep`.
- [x] 2.3 Require a living Snake Charmer target and poison it permanently; allow
  the choosing Demon to swap itself and reject another Demon.
- [x] 2.4 Spend the Philosopher ability only after a character is chosen, accept
  the Philosopher's own character, and reconcile the drunk after every
  replacement.
- [x] 2.5 Mark the Philosopher drunk in `src/core/model/effect-graph.ts` so it
  ends when the source dies; keep a borrowed death-triggered ability working.
- [x] 2.6 Let the death-triggered roles complete their own step in
  `completeStep`, drive `pruneDeadSteps` from the same map and add
  `moonchild`.
- [x] 2.7 Disable dead seats for the Snake Charmer in
  `src/ui/screens/table/cards.tsx` (a shared UI file owned by PR #99; smallest
  possible edit).

## 3. Verification

- [x] 3.1 Run `npm test` and record the count.
- [x] 3.2 Run `npm run verify`, `node scripts/openspec-check.mjs`,
  `openspec validate --changes --strict`, `openspec validate --specs --strict`
  and `git diff --check`.
- [x] 3.3 Move the four role rows in `docs/rules-matrix.md` to `verified`.
- [x] 3.4 Commit, report and stop; the owner merges.

## Evidence

- RED: `git stash push -- src/ && node --test
  --test-name-pattern="Pit-Hag|Snake Charmer|Barber|Philosopher|replacement"
  js/snv.test.mjs` against the reviewed engine produced `tests 18`, `pass 6`,
  `fail 12`, including:
  `✖ the Pit-Hag replaces a character atomically` —
  `AssertionError [ERR_ASSERTION]: the character changes, the alignment does not`;
  `✖ the Snake Charmer swaps characters and alignments with the chosen Demon` —
  `AssertionError [ERR_ASSERTION]: the poison is permanent`;
  `✖ the Snake Charmer cannot choose a dead player`;
  `✖ an evil Snake Charmer and the Demon both stay evil`;
  `✖ the Barber rejects another Demon but allows the Demon to swap itself` —
  `reason: "Нельзя выбрать Демона."`;
  `✖ a Barber swap keeps the Evil Twin pair intact` —
  `AssertionError [ERR_ASSERTION]: the good twin reference is kept`;
  `✖ the Philosopher gains the chosen ability and drunks its owner`;
  `✖ the Philosopher can decline and keep the once-per-game ability`;
  `✖ the Philosopher may choose their own character and becomes drunk`;
  `✖ the Philosopher's drunk moves to a character that enters play later`;
  `✖ a replacement clears the borrowed ability and the drunk`;
  `✖ a borrowed death-triggered ability wakes after the Philosopher dies`.
- GREEN: the same `node --test` command on the fixed engine produced `tests 18`,
  `pass 18`, `fail 0`.
- GREEN: `npm test` -> 285 tests, 285 pass, 0 fail.
- GREEN: `npm run verify` passes (typecheck, oxlint, oxfmt, 285 tests, build,
  fallback, offline, policy).
