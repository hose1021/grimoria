# Tasks

## 1. Red test

- [x] 1.1 In the player privacy block of `scripts/browser-check.mjs`, keep the
  assertion that no `.player-card` exists before a tap, replace the
  "card absent after the seat tap" assertion and the `[data-act="reveal"]`
  click with a direct `.player-card` wait, and change the deal-route locator
  `.player-view, .player-cover` to `.player-view`. Keep the table
  `[data-act="reveal"]` steps (manual mode) unchanged.
- [x] 1.2 Run `node scripts/browser-check.mjs` and record the RED result: the
  current build renders the cover view, so no `.player-card` appears after the
  seat tap.

## 2. Player handoff runtime

- [x] 2.1 In the `[data-seat]` branch of `js/player.js`, set
  `deadline = Date.now() + HIDE_SECONDS * 1000` and `view = "role"`, then
  render. Verify the regression from 1.1 passes.
- [x] 2.2 Delete `renderCover`, the `view === "cover"` branches in `render()`,
  `renderWarning()` and the Escape and `visibilitychange` handlers, and the
  cover `data-act="reveal"` and `data-act="cancel"` paths. Verify `grep -R
  "cover" js/player.js` finds no player cover references and the regression
  still passes.
- [x] 2.3 Delete `.player-view--cover` and `.player-cover` from
  `css/player.css`. Verify no reference remains in `css/` or `js/`.

## 3. Documentation and offline artifact

- [x] 3.1 Update the `/player` bullet in `SPEC.md`: a number tap shows the
  shown role with auto-hide, saving returns to the number picker, and the
  warning before returning to the host console stays.
- [x] 3.2 Run `npm run offline` after the runtime change to regenerate the
  service worker. Verify `node --test js/offline-worker.test.mjs` passes.

## 4. Verification

- [x] 4.1 Run `node --test js/*.test.mjs`, `node scripts/openspec-check.mjs`
  and `openspec validate --changes --strict`. Record the passing output.
- [x] 4.2 Run `node scripts/browser-check.mjs` with Playwright and verify the
  player flow plus no horizontal overflow at 390 pixels. Record the result.

## 5. Workflow follow-up

- [x] 5.1 Commit with a Conventional Commit message that references issue #61,
  push the branch and open a pull request against `main`. Run CI, report the
  result and stop; do not merge without an explicit owner message for that pull
  request.

## Evidence

- RED: `node scripts/browser-check.mjs` -> `AssertionError [ERR_ASSERTION]:
  the number tap reveals the role card, 0 !== 1` at
  `scripts/browser-check.mjs:865`; the seat tap still rendered the cover view.
- GREEN: `node scripts/browser-check.mjs` -> all checks passed, including
  phone/tablet overflow, privacy, route cleanup, offline reload and safe PWA
  update. `node --test js/*.test.mjs` -> 210 tests, 210 pass. `npm run
  typecheck` -> clean. `npm run build` + `npm run offline` -> 402 assets, cache
  `2770f184ddabd6bd`; `node --test js/offline-worker.test.mjs` -> 7 pass.
  `node scripts/openspec-check.mjs` -> passed, 16 specs, 2 active changes.
  `openspec validate --changes --strict` -> 2 passed.
