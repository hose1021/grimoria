# Tasks

## 1. Red test

- [x] 1.1 Add a failing regression to the player handoff block in
  `scripts/browser-check.mjs`: after `[data-act="reveal"]`, fill `#player-name`
  with a name and click `.player-save`, then assert `.player-card` count is 0
  and `.player-numbers` is visible. Run the browser check and record the RED
  result (the current build shows the done screen instead of the number grid).

## 2. Player handoff runtime

- [x] 2.1 In the `claimSeat` success path of `js/player.js`, replace the
  `view = "done"` transition with `hide()`. Verify the regression from 1.1
  passes: the role card hides and the number picker returns.
- [x] 2.2 Delete `renderDone`, the `view === "done"` branch in `render()` and
  the `data-act="next"` click branch. Verify `grep -R` finds no `renderDone`
  or `data-act="next"` reference under `js/` and the regression still passes.
- [x] 2.3 Remove the `passNext`, `roleSaved` and `hidden` keys from
  `js/locales/en.js`, `js/locales/ru.js` and `js/locales/az.js`. Verify no
  reference remains under `js/` and `node --test js/strings.test.mjs` passes.

## 3. Documentation and offline artifact

- [x] 3.1 Update the `/player` bullet in `SPEC.md` to state that a saved name
  returns to the number picker, and that all claimed numbers route to seat
  arrangement. Verify the text matches the implemented flow.
- [x] 3.2 Run `node scripts/build-offline.mjs` to regenerate `sw.js`. Verify
  `node --test js/offline-worker.test.mjs` passes.

## 4. Verification

- [x] 4.1 Run `node --test js/*.test.mjs`, `node scripts/openspec-check.mjs`
  and `openspec validate --changes --strict`. Record the passing output.
- [x] 4.2 Run `node scripts/browser-check.mjs` with Playwright and verify the
  player flow plus no horizontal overflow at 390 pixels. Record the result.

## Evidence

- RED: `node scripts/browser-check.mjs` -> `AssertionError: the number picker
  returns after saving the name`, `0 !== 1` at `scripts/browser-check.mjs:782`;
  the save rendered the done screen instead of `.player-numbers`.
- GREEN: `node scripts/browser-check.mjs` -> all checks passed, including
  phone/tablet overflow, privacy, route cleanup, offline reload and safe PWA
  update. `node --test js/*.test.mjs` -> 209 tests, 209 pass. `node --test
  js/offline-worker.test.mjs` -> 6 pass. `node scripts/openspec-check.mjs` ->
  passed, 10 specs, 4 active changes. `openspec validate --changes --strict` ->
  4 passed. `sw.js` cache `pg-static-aa760945be1995cb`, 424 assets.

## Workflow follow-up

- Create a `feat/` or `fix/` branch from the current `origin/main`, commit with
  a Conventional Commit message that references issue #48, and open a pull
  request against `main`.
- Run CI, report the result and stop; do not merge without an explicit owner
  message for that pull request.
