# Proposal

Issue: #467

## Why

At a phone width, `/bag` rendered the player-count header, then the preset,
manual and random pickers and the bluffs. The scenario picker and the
composition summary sat at the bottom of the page, so the host met the bag
choices before choosing what the bag is for.

## What Changes

- Below 900 CSS pixels, render the scenario picker and the composition summary
  directly after the player-count header, before the pickers and the bluffs.
- Keep the desktop two-column layout: the scenario and composition rail stays in
  the left column.
- Add the focused `mobile-bag-order` browser check and record the changelog
  entry.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: the mobile bag composition order.

## Impact

- UI: `src/ui/screens/bag.tsx`.
- Checks: `scripts/browser-check.ts` gains the `mobile-bag-order` focused case.
- Records: `CHANGELOG.md` under `Unreleased`.
- Untouched: the engine, the state model, the commands, the storage keys and the
  desktop layout.
