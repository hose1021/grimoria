# Proposal

Issue: #187

## Why

The first-night Lunatic card listed the real Minions, and the app picked them
for the Storyteller. The official rules let the Storyteller point at any
players, so the app auto-filled false information and could name players the
host did not choose. The card also differed from the Demon's card, which told a
player who knows the app that they were the Lunatic.

## What Changes

- The first-night Lunatic step takes exactly one target per Minion in play; the
  Storyteller taps any players on the table.
- The Lunatic card mirrors the Demon card: the Lunatic's own seat as the
  believed Demon, the picked Minion players and the bluffs.
- First-night picks are not recorded as an attack and are not reported to the
  Demon.
- The first-night guide and the role-support copy describe the picker instead
  of the attack.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/table-console`: adds the Lunatic night-one bluff card requirement.

## Impact

- Engine: `src/core/engine/bmr.ts`, `src/core/engine/night.ts`.
- UI: `src/ui/screens/table/dialogs.tsx`, `src/entry/guidance.ts`,
  `src/ui/i18n/locales/{ru,en,az}.ts`.
- Tests: `src/core/engine/bmr.test.ts`, `src/core/engine/acceptance.test.ts`,
  `scripts/browser-check.ts`.
- No state schema, storage key, route or projection change; the picks use the
  existing step `targetIds` and the step draft.
