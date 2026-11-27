# Tasks

## Grouping

- [x] Add the optional group label to `EventEntry`.
- [x] Render sequential sections in `EventLog`, hiding empty groups.
- [x] Add the grouped mode to `GameLog` and use it in `OverCard`.
- [x] Extend the `game-end-chronicle` browser case with the phase headings.

- RED: with the UI change stashed, `PG_BROWSER_CHECK=game-end-chronicle` failed on `the chronicle is grouped by phase` (`false !== true`).
- GREEN: the same check passed with two headings, the first `Ночь 1`, and `PG_BROWSER_CHECK=journal-pairs` still passed.

## Verification

- [x] `npm test` — 1600 passed.
- [x] `npm run typecheck`.
- [x] `npm run build`.
- [x] `node scripts/openspec-check.ts` and `openspec validate --changes --strict`.
