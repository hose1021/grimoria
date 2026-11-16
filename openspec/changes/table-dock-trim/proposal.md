# Proposal

Issue: #258

## Why

The fixed dock carried information the host does not need at every glance. An
empty timer showed a `—` placeholder beside undo and read as a broken control.
The dock repeated the vote threshold that the hub already shows and printed an
instruction that only restated why the execute control was disabled. The
day-help action did not say whether the sheet held any role form, so the host
opened an empty sheet to find out. The action also had no visible button shape.

## What Changes

- The dock timer readout renders only while a timer is running.
- The dock drops the disabled-execution footnote and the repeated threshold
  line; the hub keeps the threshold.
- The day-help action shows the number of role forms the sheet currently holds.
- The day-help action uses the outline button style.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/table-console`: the vote threshold stays in the hub only, and the day
  help action reports how many role forms the sheet holds.

## Impact

- UI: `src/ui/screens/table/dock.tsx`, `src/ui/screens/table/cards.tsx`,
  `src/ui/screens/table/helpers.ts`, `src/ui/screens/table/helpers.test.ts`.
- Regression harness: `scripts/browser-check.ts` reads the hub threshold.
- No engine, state schema, storage key, route or projection change.
