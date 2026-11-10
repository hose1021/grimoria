# Design

## Context

See `proposal.md` for the motivation. The player handoff in `js/player.js`
renders four states: `numbers`, `cover`, `role` and `done`. The `done` state
exists only after a successful `claimSeat`; it shows a title, a saved-role note
and either a next-player button or the seat-arrangement button. The `numbers`
state already renders the seat-arrangement button when no open number remains.

`hide()` already resets the timer deadline, seat and view to the number picker,
and is used by the auto-hide timer, Escape and `visibilitychange`.

## Goals / Non-Goals

**Goals:**

- One save action moves the player from the role card to the number picker.
- No dead state, markup or translation keys remain.
- The privacy cover and the auto-hide deadline keep their current behavior.
- A browser regression proves the save transition.

**Non-Goals:**

- Removing the cover screen or the reveal button.
- Changing seat claiming, name validation or engine behavior.
- Changing the warning modal before returning to the host console.

## Decisions

### Reuse `hide()` after a successful claim

The submit handler currently sets `view = "done"` and renders. Replace that
with `hide()`, which stops the timer and resets `view`, `seat` and `deadline`
before rendering the number picker. This reuses the existing reset path instead
of duplicating three assignments. Alternative: keep a new `returnToPicker()`
helper; rejected as a second name for the same state reset.

### Delete the `done` state rather than leave it unreachable

Remove `renderDone`, the `view === "done"` branch in `render()`, and the
`data-act="next"` click branch. Unreachable markup would keep dead locale keys
and invite a later accidental revival. The number picker's existing
`open === 0` branch still routes to `/seat` after the last claim, so the seat
route does not depend on the removed state.

### Remove the three now-unused locale keys

`passNext`, `roleSaved` and `hidden` are used only by `renderDone`; remove them
from the English, Russian and Azerbaijani catalogs. `js/strings.test.mjs`
compares key sets, so all three catalogs must change together.

### Keep the cover screen

The cover screen is the deliberate reveal step documented in `SPEC.md`; the
requested change covers only the post-save confirmation. Removing the cover
would expose a role on a mistap and break the current browser assertion that no
card exists before reveal.

## Risks / Trade-offs

- **The number picker is the next screen for the next player, so the previous
  player must hand the device over after saving.** → The save button already
  says "Save and hide", and the picker shows claimed numbers with names; no
  additional confirmation is needed.
- **Removing locale keys can break a dynamic key lookup.** → Search confirms
  the keys are used only in the removed markup; the parity test covers the rest.
- **`sw.js` is generated from runtime assets.** → Regenerate it after the
  runtime change, as required by `AGENTS.md`.

## Migration Plan

No data or schema migration. Existing saves and claimed numbers are unchanged.
Rollback is a revert of the runtime, locale, test and documentation edits plus a
regenerated service worker.
