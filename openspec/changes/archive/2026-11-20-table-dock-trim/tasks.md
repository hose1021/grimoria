# Tasks

## 1. Failing check first

- [x] 1.1 Remove the dock threshold assertion from the night table-window
  block in `scripts/browser-check.ts`. The day hub block already asserts
  `[data-hub-threshold]` for fifteen living players with eight votes.

## 2. Implementation

- [x] 2.1 Add `dayHelpForms(state)` and `dayHelpFormCount(state)` to
  `src/ui/screens/table/helpers.ts`.
- [x] 2.2 Gate the day card role forms on the shared list and label the dock
  action with the count.
- [x] 2.3 Render the dock timer only while a timer runs.
- [x] 2.4 Remove the dock threshold line and the disabled-execution footnote.
- [x] 2.5 Style the day-help action as an outline button.

## 3. Verification

- [x] 3.1 Run `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run format:check` and `npm run build`.
- [x] 3.2 Run `node scripts/openspec-check.ts` and
  `openspec validate --changes --strict`.
- [x] 3.3 Verify the day console in a real browser at desktop and about 390 px:
  no timer placeholder, no dock footnotes, `Помощь дня (1)` on a Virgin day,
  and the sheet holds exactly one form.

## Evidence

- RED: CI run 43896064321 failed the Playwright check at
  `locator('[data-hub-threshold]')` in the night table-window block: the night
  hub renders no threshold. The assertion now lives only in the day hub block,
  which asserts eight votes for fifteen living players.
- GREEN: `npm test` -> 762 tests, 762 pass, including "the day-help count names
  the role forms the sheet can show".
- GREEN: `npm run typecheck`, `npm run lint`, `npm run format:check` and
  `npm run build` pass on this branch.
- GREEN: the console at 1100 px and 390 px on the Vite dev server shows
  `Помощь дня (1)`, no timer dash and no dock footnotes; the day-help sheet
  renders one Virgin form; the console reports no errors.
- `npm run verify` in this working copy stops at `check-types-policy` on the
  untracked `dist-root/` build artifact. The same check passes for `src/`, and
  the tracked files contain no JavaScript source outside the locale data.
