# Design

## Context

`scripts/browser-check.mjs` already drives the built artifact through night,
day, dialogs, privacy and offline flows, but every scenario starts from a
seeded or pre-navigated state and the viewport checks use 360 px width with a
900 px height. Issue #46's acceptance requires the opposite start: a blank
profile at a real phone viewport, with the finale reached by taps.

The browser suite builds two artifacts (project subpath and root) in test mode,
so `window.PG_MODULES()` resolves the same store and engine the app uses. The
walk uses it for two things only: the current night step's target mode and the
Imp's player id. Every transition is still a Playwright click, tap or select on
a visible control.

## Decisions

### One walk function, run at both viewports

`walkPhone({ width, height })` creates a fresh browser context, so the second
viewport repeats the whole journey from a clean profile. The visited screens are
recorded in order and compared to the expected list, which documents per-screen
coverage in one assertion.

### A clean profile is part of the contract

Before the first interaction the only allowed storage key is `pg.lang`. After
the walk the only keys are `pg.lang`, `pg.game.v4` and `pg.stepDraft`; the
recovery aid is written by the console itself, needs no host input and is
inert for a foreign game, so it is not a configuration. `pg.library.v1` must be
absent. That proves no config file or saved-bag registry is required.

### Controls are audited, not the whole DOM

The audit selects visible `a[href]`, `button` and `[role="button"]` elements
inside `#screen`. It asserts:

- `document.documentElement.scrollWidth <= innerWidth` (no document overflow);
- every control's left/right edge is inside the viewport;
- every control is at least 44x44 CSS px, the target the `app/ui-and-privacy`
  requirement already names;
- no control crosses the horizontal edge of an `overflow-x: hidden|clip`
  ancestor.

Text and table cells are not controls and stay out of the assertion; the review
table keeps its intentional internal horizontal scroll.

### The finale is a good victory

The day card offers every living player as an execution target. The host knows
the Imp from the secrets screen, so the walk selects the Imp's option and
executes it; the game transitions to the over card without simulating votes.
This is a host decision through the rendered control, not a store mutation.

## Risks

- The recommended preset is randomised among three legal bags. The secrets
  filler derives each pair from the rendered heading and options, so it covers
  every information role the preset can deal.
- The walk depends on the same test-mode probe the rest of the suite uses; the
  probe is emitted only for `--mode test`, which the harness already builds.
