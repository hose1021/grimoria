# Proposal

## Why

The seat screen keeps its action list in the left rail, so the host looks away
from the ring to shuffle, undo or commit. The footer repeats the same
navigation: a standalone "Игроку" link and a "Далее: секреты" link. Moving the
actions under the ring puts every seat decision in one place and removes the
duplicate routes.

Issue: #154

## What Changes

- Move the action list from the left rail into the bottom bar of the main seat
  column, under the ring.
- The bottom bar carries the status line and four actions: Игроку, Отменить,
  Перемешать, Использовать порядок.
- Remove the "Секреты" action from the seat screen and the "Далее: секреты"
  footer link. `/secrets` stays reachable from the app bar.
- Remove the standalone "Игроку" footer link; one control remains in the action
  row.
- "Использовать порядок" SHALL commit the draft exactly as shown: the same
  player ids in the same positions, `seat` mirrored to the new positions, and
  the existing forward navigation kept. It SHALL NOT re-sort, re-deal or
  shuffle.
- The left rail keeps the title card and the numbered seat list. The right rail
  keeps its hints. No command, storage key, route or persisted preference
  changes.
- The action row wraps without horizontal overflow at 390 px and every control
  stays at least 44 px high.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: adds one requirement for the seat screen action dock: its
  location, the four visible actions, the removed secrets shortcuts, the
  exact-order commit and the narrow-viewport layout.

## Impact

- `src/ui/screens/seat.tsx`: the actions section moves from the left aside into
  the main footer; the footer anchors for player and secrets are removed; the
  existing `data-act` hooks stay.
- `src/ui/i18n/translate.ts`: the now-unused "Next: secrets" key is removed from
  the three catalogs; "Actions" stays as the action group's accessible name.
- `scripts/browser-check.mjs`: the seat checks assert the new action location,
  the missing secrets shortcuts, the narrow layout and that the use action
  commits the displayed order unchanged.
