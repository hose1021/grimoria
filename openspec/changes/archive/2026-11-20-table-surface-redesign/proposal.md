# Proposal

Issue: #266

## Why

The host table still reads as a green felt ellipse with the Arcane stone palette
and a cramped seat ring. The owner's references are dark tabletop clients with a
racetrack/stadium table, equal spacing around the whole perimeter and a fixed
action dock. The table must look like one solid table, read as vertical on a
phone and horizontal on a desktop, and seat anywhere from five to fifteen
players without a fixed bottom player.

## What Changes

- Replace the ellipse with one measured stadium contour: two straight sides
  joined by two semicircular caps. The rail, the felt surface and every seat
  centre use that one contour.
- Place seats at equal arc distance along the contour, recalculated from the
  measured table box and the seat count. No hardcoded per-seat top/left, no
  fixed bottom seat, no bottom-centre owner.
- Keep the stadium vertical on a phone and horizontal on a desktop; the same
  geometry runs at every width and for every supported count.
- Give the table an outer rail and an inner felt surface on the same contour,
  with the obsidian surface family and one static centre glow.
- Restyle seats as identity blocks: medallion, name and one compact status
  line; labels inward on the sides and outward on the caps so they stay inside
  the box. Keep the text badges and the 44 px target.
- Promote the hub readout to the reference's numeric hero.
- Restyle the fixed dock with 4 px corners and turquoise primary, neutral
  secondary and soft red danger roles; gold marks the phase.
- Apply the full Obsidian & Antique Gold palette to the shared token layer, so
  every route reads it: #0B0E12 page, #141A21 panel, #1D2630 raised, #32404C
  border, #F3EFE6 text, #A2AFBF muted, #4BB8AA primary, #68D4C4 hover,
  #E1B669 gold, #71CB91 success, #E36D75 danger. The table tokens alias it.
- Use the success token for the setup and secrets completion states instead of
  the Outsider team green.
- Apply the shared component standard to the setup and secrets screens:
  compact bag cards with one accent on the chosen set, reminder cards instead
  of a wide table, occupied and available player seats with distinct states,
  a larger seat circle without duplicated numbers, and a step sheet that
  merges the acting-role header and shows only the chosen target.
- Change the phone table aspect to `100/135` so a fifteen-seat ring and its
  labels fit the stage at 390 px; keep the desktop box uncapped at 560 px.
- Add only the tokens the palette needs to the one `@theme` block.
- **BREAKING** for visual acceptance: the ellipse and its fixed seat
  percentages are gone, the acting outline moves to table primary, state badges
  stop being pills, and the stone/amber palette becomes obsidian/turquoise/gold
  on every route.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/table-console`: the table becomes a measured stadium with equal arc
  spacing, responsive orientation, rail and surface on one contour, and the
  reference's seat, hub and dock styling. Mechanics, commands, projections and
  the seat target size stay unchanged.
- `app/arcane-visual-system`: the material palette becomes obsidian with muted
  turquoise primaries, antique gold phases, success green and soft red danger.
- `app/design-tokens`: the shared theme declares the full semantic palette, and
  the table tokens alias it instead of restating its values.

## Impact

- Geometry: `src/ui/screens/table/ring.ts` (contour + layout) and
  `src/ui/screens/table/ring.tsx` (measurement, rail, surface, seats).
- UI: `src/ui/screens/table/dock.tsx`, `ring.ts`, `styles.ts`;
  `src/ui/screens/bag.tsx` and `src/ui/screens/secrets.tsx` use the success
  token for completion states.
- Tokens: `css/app.css` `@theme` block (shared palette and table aliases).
- Tests: `src/ui/screens/table/helpers.test.ts` (arc spacing, box fit, no bottom
  centre) and `scripts/browser-check.ts` (rail, felt, squared controls, hero,
  no overlapping medallions, routes and languages after the palette change).
- Untouched: the engine, state schema, storage key, routes, projections, the
  shared app bar composition, overlays and every non-`/table` screen layout.
- Deliberately absent: poker furniture. The reference's pot, chip balance,
  community cards and currency have no game-state source.
