# Proposal

Issue: #487

## Why

`/bag` fills three Demon bluffs from every recommended preset and from the
random bag. The "Edit bluffs" control then opens the eligible picker with every
option `disabled`, because the picker refuses a selection once the list is full.
A click on an eligible good character does nothing, so the full list looks
read-only. The host has to discover that a filled slot can be cleared first.

## What Changes

- Make every eligible unselected character selectable while the bluff list is
  full.
- A pick on a full list replaces the oldest bluff, so the list always holds
  exactly the required count and repeated picks cycle the entries.
- Keep the eligible pool unchanged: only good characters not in play, without
  the Drunk mask, per the pinned Demon info rule.
- Add a focused unit test for the capped selection and extend the existing
  `lunatic-setup` browser check with a full-list pick.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/table-console`: the setup bluff and mask controls.

## Impact

- UI: `src/ui/screens/bag.tsx`, plus a small `bluff-selection.ts` helper.
- Tests: `src/ui/screens/bluff-selection.test.ts`, `scripts/browser-check.ts`.
- Records: `CHANGELOG.md` under `Unreleased`.
- Untouched: the engine, the state model, the commands, the storage keys and the
  eligible-character filter.
