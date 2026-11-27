# Tasks

- [x] Bind private table views and correction drafts to the original game and assignment.
- [x] Preserve damaged library bytes and cancel dismissed or superseded imports.
- [x] Keep character searches and read-only locations across navigation. Give failed reference downloads a retry action.

## RED on 0.12.4

- RED: Replacing the game while the first seat’s Chef card was open showed the replacement Imp. Removing the displayed seat left a blank handoff.
- The library regression tests rejected a valid restore over damaged JSON and allowed a cancelled import waiting for the write lock to take effect.
- Rendering the reference with its dataset pending omitted the return link and loading indicator, reported no Pit-Hag interactions and labelled the Slayer passive.
- The page-restore regression returned true for `/reference`. In the released app, dispatching a persisted `pageshow` on the Chef reference opened `/player`.

## GREEN on 0.12.5

- GREEN: `node --test src/ui/screens/table/handoff.test.ts src/infrastructure/library/bag-library.test.ts src/entry/page-restore.test.ts src/ui/reference-route.test.ts` passed all 21 tests for handoff invalidation, restore and retry, cancellation and route selection.
- In the built app, replacing a game from a second tab covered the Chef card until the host returned to the table. A real file import restored a pool and retained the original damaged JSON. Browser Back retained a Chef search, a persisted `pageshow` retained the reference URL, and retrying a failed Pit-Hag reference download showed the Goon interaction.
- The Russian Chef reference fit a 390-pixel viewport with a working character index link and a clean browser console.
- `npm run verify` passed with 1,654 application tests. All 141 tooling tests passed. Strict OpenSpec validation passed for 40 active changes and 27 baseline specs, and `VERIFICATION_BASE_REF=origin/main npm run verification:all` passed.
- Automated browser coverage lives in `table-handoff-replacement`, `reference-reading` and `saved-custom-bag`. The full Playwright and game-scenario suites were not run locally.
