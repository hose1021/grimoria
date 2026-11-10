# Design

## Context

See `proposal.md` - Why. `js/player.js` renders three handoff states after the
#48 change: `numbers`, `cover` and `role`. A number tap sets `seat`, switches to
`cover` and waits for `data-act="reveal"`, which sets the auto-hide deadline and
switches to `role`. `hide()` resets `view`, `seat` and `deadline` and is shared
by the timer, Escape, `visibilitychange` and `pagehide`. `renderRole()` calls
`startTimer()`, and `startTimer()` keeps an existing `deadline` value.

## Goals / Non-Goals

**Goals:**

- One tap moves from the number picker to the shown-role card.
- The auto-hide deadline starts on that tap, as it did on the reveal button.
- No dead state, markup, handler or CSS class remains.

**Non-Goals:**

- Changing the number picker copy, the claimed-number list or the seat route.
- Changing the host cover in `js/app.js` or the `playerCover` catalog key it
  uses.
- Changing seat claiming, name validation, the warning modal or the engine.

## Decisions

### Set the deadline in the seat handler

The removed reveal branch already contained the two writes that matter:
`deadline = Date.now() + HIDE_SECONDS * 1000` and `view = "role"`. Move them
into the `[data-seat]` branch next to `seat = index`, then call `render()`.
`renderRole()` starts the timer and `startTimer()` reads the deadline that the
tap set, so the countdown and the auto-hide behavior stay identical.
Alternative: let `renderRole()` assign the deadline; rejected because
`startTimer()` would then treat a missing deadline as an implicit rule hidden
one call deeper, and the reveal branch already proves the explicit write works.

### Delete the cover state instead of leaving it unreachable

Remove `renderCover`, the `view === "cover"` branches in `render()`,
`renderWarning()` and the Escape and `visibilitychange` handlers, the
`data-act="reveal"` branch, and the cover `cancel` usage. Unreachable markup
keeps dead CSS and invites a later revival. The `hide()` reset path already
covers returning to the picker.

### Keep both catalog keys

`playerCover` is still read in `js/app.js` for the host cover shown when the
host leaves `/player` for `/bag`, `/seat` or `/secrets`. `playerReveal` remains
the `aria-label` suffix on free number buttons, which still describes the
action. No catalog file changes, so the key parity test is unaffected.

### Delete the two dead CSS rules

`.player-view--cover` and `.player-cover` style only the removed markup. Remove
both from `css/player.css`; no other selector depends on them.

### Update the browser regression in place

The player privacy block already opens `/player`, asserts no card before a tap,
taps a seat and then clicks reveal. Drop the reveal click and assert the card
after the tap instead. The deal-route check locates `.player-view,
.player-cover`; reduce it to `.player-view` because the button class no longer
exists.

## Risks / Trade-offs

- **A mistap now exposes the player's shown role for up to 45 seconds.** → The
  picker hint already tells the player to tap only when the screen is covered,
  and the cancel button, Escape, `visibilitychange` and the auto-hide deadline
  all remain. `SPEC.md` states the app is a local aid, not a security boundary,
  and the card shows only the shown role.
- **A skipped cover keeps the "no card before the tap" assertion necessary.** →
  Keep that assertion in the regression; it proves the picker itself renders
  no role.
- **`sw.js` precaches runtime assets.** → Regenerate it after the runtime
  change, as `AGENTS.md` requires.

## Migration Plan

No data or schema migration. Rollback is a revert of the runtime, CSS, test and
documentation edits plus a regenerated service worker.
