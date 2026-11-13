# Proposal

Issue: #143

## Why

The role sheet is the reference a player reads at the table. Each card clamps
the ability to three lines at 9.5 px, so the longest Russian ability (Pit-Hag,
186 characters) loses about half of its text behind an ellipsis in a 250 px
column, and still exceeds three lines in the single mobile column. A truncated
rule is worse than no sheet: it reads as the complete rule.

## What Changes

- Remove the three-line clamp from the compact row card used by the sheet, so
  the card grows to the height its text needs.
- Raise the role name to the 16 px theme size and the ability to the 12 px theme
  size in that card, so both are readable.
- Raise the sheet grid minimum column from 250 px to 320 px so the text column
  keeps a readable measure; the single-column layout below 680 px stays.
- Extend the browser check to cover all 72 standard roles and 5 Travellers at
  320, 360, 390, 768, 1280 and 1440 px: ability text equals the catalog text,
  no line clamp, no clipped content, name at least 16 px and ability at least
  12 px.

No route, command, store, engine, catalog or translation change, and no
breaking change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: the role sheet must show every role's name and ability in
  full and at a readable size at every supported width; the browser check
  asserts it.

## Impact

- `src/ui/components/arcane/role-card.tsx`: the compact row branch only.
- `src/ui/screens/sheet.tsx`: the standard and Travellers grids.
- `scripts/browser-check.mjs`: new sheet legibility assertions.
- No change to `scripts/fixtures/computed-styles.json` expected: its probes do
  not target role cards.
