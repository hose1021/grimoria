# Proposal

Issue: #61

## Why

The `/player` handoff asks for a number tap and then a second tap on a cover
screen ("Закройте экран" / "Показать роль"). The cover step adds one tap for
every player and one screen without a decision; the number picker already tells
the player to tap only when nobody else can see the screen. The previous
handoff change (#48) removed the post-save confirmation, and the cover is the
last redundant step in the same flow.

## What Changes

- Tapping a free number SHALL render the shown-role card immediately and start
  the existing 45-second auto-hide deadline on that tap.
- **BREAKING** (UI): remove the player cover view: its title, seat line, reveal
  button and cancel button.
- Remove the cover branch from rendering, the `data-act="reveal"` handler, the
  `cover` view state, and the cover cases in the warning modal, Escape and
  `visibilitychange` handlers.
- Delete the now-unused `.player-view--cover` and `.player-cover` rules from
  `css/player.css`.
- Update the player privacy regression in `scripts/browser-check.mjs`: a seat
  tap shows the role card at once, and the reveal click and the stale
  `.player-cover` selector disappear.
- Keep the number picker, the shown-role card, the name form, the cancel
  button, auto-hide and the warning before returning to the host console.
- Keep the `playerCover` and `playerReveal` catalog keys: `js/app.js` uses
  `playerCover` for the host cover after leaving `/player`, and the number
  button aria-label uses `playerReveal`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-and-privacy`: the player handoff reveals the shown role on the number
  tap, without a separate cover step.

## Impact

- Runtime: `js/player.js`; `css/player.css`.
- Tests: `scripts/browser-check.mjs` (player privacy flow).
- Docs: `SPEC.md` `/player` bullet; `sw.js` regenerated after the runtime asset
  change.
- No engine, state schema, storage, locale or API change.
