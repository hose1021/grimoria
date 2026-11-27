# Proposal

Issue: #191

## Why

Clicking a player seat during the day silently selected an execution target.
The host had no way to open that player's card from the table, and the
execution choice lived in the day-help sheet only through a select the sheet
hid in the role-form mode. The day-help sheet must stay free of generic
execution controls.

## What Changes

- A seat click during the day opens the player sheet for that player.
- The player sheet offers select and clear for the execution target; the dock
  remains the only control that records the execution.
- A corpse can still be selected for execution, matching the engine.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/table-console`: the day help sheet requirement gains the seat-to-sheet
  interaction and keeps the dock as the only execution control.

## Impact

- UI: `src/ui/screens/table/index.tsx`, `src/ui/screens/table/dialogs.tsx`,
  locales.
- Regression harness: `scripts/browser-check.ts` day execution block and the
  other table execution scenarios.
- No engine, state schema, storage key, route or projection change.
