# Tasks

## 1. Failing check first

- [x] 1.1 Point the table window assertion in `scripts/browser-check.ts` at the
  hub threshold. Playwright is not installed in this checkout, so the harness
  did not run here: `import("playwright")` fails with `ERR_MODULE_NOT_FOUND`.
  The old assertion read `[data-dock-threshold]`, which the new dock does not
  render, so the harness would fail on the missing selector until this change.

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

- RED: not run as a live harness. The old browser check asserted
  `[data-dock-threshold]`; the new dock renders none, so that assertion would
  fail on the missing selector. Playwright is absent here (`ERR_MODULE_NOT_FOUND`).
- GREEN: `npm test` -> 733 tests, 733 pass, including "the day-help count names
  the role forms the sheet can show".
- GREEN: the built console at 1100 px and 390 px shows `Помощь дня (1)`, no
  timer dash and no dock footnotes; the day-help sheet renders one Virgin form;
  the console reports no errors.
- `npm run verify` stops at `check-types-policy` on the untracked `dist-root/`
  build artifact in the working copy. The same check passes for `src/`, and the
  tracked files contain no JavaScript source outside the locale data.
