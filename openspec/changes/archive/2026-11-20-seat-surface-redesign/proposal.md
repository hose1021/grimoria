# Proposal

Issue: #282

## Why

`/seat` still reads as a three-column setup form: a left rail with a name list,
a square ring of amber hexagons, and a right column of Russian-only tips. The
obsidian `/table` standard (merged from `table-surface-redesign`) instead shows
one stadium of round medallions, a numeric centre and a fixed action dock. The
two screens are consecutive steps of the same setup flow, so the host leaves the
new table and lands on an older-looking screen.

## What Changes

- Replace the `/seat` three-column composition with the `/table` composition:
  the shared app bar, one scrollable stage holding the measured stadium rail and
  felt, seats on the stadium contour, a numeric centre and a fixed action dock.
- Render each seat as a round medallion with the player initial, a name label
  placed on the inward/outward side the table uses, the seat number from 620 px,
  and a "Start" mark on seat 1. Selection and drag target use the table primary
  outline instead of the amber hexagon.
- Keep the existing draft mechanics unchanged: click pairing, pointer drag,
  shuffle, undo, Escape cancel, publish-keeps-draft and the commit action.
- Promote the centre readout to the table hub shape: a small-caps label, the
  player count as the hero numeral and the dead count as the secondary line.
- Restyle the bottom bar as the table's fixed action dock: a title/status row
  and four squared actions, with "Use this order" as the table primary action.
- Remove the left name list and the right tips column, including its
  untranslated Russian copy.
- Extract the measured stadium surface from `TableRing` into modules shared by
  `/table` and `/seat`, so both screens use one contour, one felt and one layout
  observer instead of a second copy.
- Reuse the existing table tokens; add no token, stylesheet or dependency.
- **BREAKING** for visual acceptance only: `/seat` no longer renders the side
  columns, and its 1280/390 computed-style entries differ from the pre-migration
  fixture.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: the seat screen composition, its ring surface and its dock
  take the table standard; the draft-swap behavior and the names-only rule stay.
- `app/arcane-visual-system`: the table surface family also covers the `/seat`
  ring, not only `/table`.
- `app/table-console`: the table visual scope widens to the `/seat` ring while
  every other route keeps its composition.

## Impact

- UI: `src/ui/screens/seat.tsx`; a new shared surface module under
  `src/ui/screens/table/`; `src/ui/screens/table/ring.tsx` and `ring.ts` for the
  extracted layout hook and the exported label-side map.
- Regression harness: `scripts/browser-check.ts` gains surface, medallion and
  fifteen-name assertions for `/seat`, and its player-link selector moves from
  `main` to the seat action group because the action moves into the dock.
- Untouched: the engine, state model, commands, storage keys, projections,
  routes, the app bar, `/bag`, `/secrets`, `/table` behavior and every token
  value. No new dependency and no second stylesheet.
- Known limitation: `scripts/fixtures/computed-styles.json` already predates the
  merged obsidian table and the parity script is not part of `npm run verify` or
  CI; this change does not re-record that fixture.
