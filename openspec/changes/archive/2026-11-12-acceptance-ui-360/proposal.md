# Proposal

Issue: #46

## Why

Issue #46 (Stage 5, CI acceptance) collects the end-to-end acceptance checks.
This change is its phone-viewport slice: a clean installation must be able to
play from the setup prompt to the finale at 360x640 portrait and 640x360
landscape without a config file, a saved bag registry, a horizontally scrolling
document or a control that is clipped or too small for a finger.

The current build reaches the finale, but three touch controls on the path are
below the 44 px target the project already requires: the console header
**Undo** and **Hide** buttons (36-38 px high), the bag count steppers (40x40)
and the scenario/mode pills (31 px high). Nothing in the browser suite records
the clean-profile walk or measures the controls yet.

## What Changes

- Add one Playwright acceptance walk to `scripts/browser-check.mjs` that runs at
  360x640 and 640x360 from a blank profile and reaches the setup prompt, bag,
  player handoff, seat order, secrets, first night, first day, over card and
  review by tapping visible controls only.
- Assert at every screen that the document does not overflow horizontally, that
  no link or button leaves the viewport, that no link or button is clipped by an
  overflow-hidden ancestor, and that every link or button is at least 44x44.
- Assert that a clean profile needs only the language preference and the game
  save; no config file and no `pg.library.v1` registry are required.
- Fix the controls the check exposes: the console header buttons, the bag
  steppers and the bag scenario/mode pills.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: adds the phone finale path, the no-overflow rule and the
  touch-sized, unclipped-control rule at the path's two viewports.

## Impact

- Runtime: `src/ui/screens/table/styles.ts` (header button height) and the
  legacy `css/bag.css` / `css/setup.css` (bag pills and steppers).
- Tests: `scripts/browser-check.mjs`.
- No dependency, API, save-format or behaviour change.
