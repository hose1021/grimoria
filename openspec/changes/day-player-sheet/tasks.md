# Tasks

## 1. Failing check first

- [x] 1.1 Change the day execution block in `scripts/browser-check.mjs` to click
  a seat, wait for the player sheet, choose the execution target there and then
  press the dock execute control. Run it against the old day branch and record
  the failure: the click selected the target and no player sheet opened.

## 2. Implementation

- [x] 2.1 Change the day branch of `selectSeat` to open the player sheet with
  the clicked player.
- [x] 2.2 Add the select/clear execution button to the player sheet, using the
  shared `executeTarget` draft and no alive-only guard.
- [x] 2.3 Update the other day execution scenarios in the browser check and the
  shared `playDay` helper in `scripts/scenario-kit.mjs` to open the player sheet
  before the dock execute.
- [x] 2.4 Clear the shared execution target after a dock execution and when a
  new game or import changes `createdAt`.

## 3. Verification

- [x] 3.1 Run `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run format:check` and `npm run build` in the worktree.
- [x] 3.2 Run `node scripts/openspec-check.mjs`,
  `openspec validate --changes --strict` and `openspec validate --specs --strict`.
- [x] 3.3 Verify the flow in a real browser at desktop and 390 px: a seat opens
  the sheet, the sheet selects the target, the dock executes, and the console
  stays clean.

## Evidence

- RED: before the change, `scripts/browser-check.mjs` clicked
  `[data-seat-open="2"]` and expected `[data-act="execute"]` to become enabled;
  with the new sheet assertion the same block fails at
  `page.waitForSelector("[data-player-sheet]")` because the day branch set the
  execution target instead of opening a sheet.
- GREEN: `npm test` -> 605 tests, 605 pass.
- GREEN: `npm run typecheck`, `npm run lint`, `npm run format:check` and
  `npm run build` pass.
- GREEN: `node scripts/openspec-check.mjs` and both `openspec validate` modes
  pass.
- GREEN browser: seat 2 opened the sheet, "Select for execution" highlighted
  the seat and enabled the dock, and the dock recorded the execution; no
  console errors, no horizontal overflow at 390 px.
- GREEN: the corpse execution scenario passes at 390 and 1280 px; the dock
  clears the target after a run and a new game clears a stale target.
- GREEN: the full `scripts/browser-check.mjs` passes locally with Playwright
  1.65.0, including the day player-sheet and corpse execution scenarios.
- `scripts/run-scenarios.mjs` exercises the same player-sheet flow in CI; the
  local Windows run is blocked by the known `serve-dist.mjs` header race, not by
  this change.
