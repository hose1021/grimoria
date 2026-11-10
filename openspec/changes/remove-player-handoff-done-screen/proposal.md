# Proposal

Issue: #48

## Why

After a player saves their name, the handoff shows a separate "pass the device
to the next player" screen. That screen adds one tap to every player and guards
nothing: the role card is already hidden. The next player should see the number
grid immediately.

## What Changes

- After a successful name save, the player handoff returns to the number grid
  instead of the "pass the device" screen.
- **BREAKING** (UI): remove the player handoff done view: its title, saved-role
  note and next-player button.
- Remove the now-unused `passNext`, `roleSaved` and `hidden` locale keys from
  the English, Russian and Azerbaijani catalogs.
- Keep the cover screen ("Закройте экран" / "Показать роль"), the shown-role
  card, name validation, the auto-hide deadline and the warning before
  returning to the host console.
- Add a browser regression check for the save → number grid transition.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-and-privacy`: the player handoff flow returns to the number picker
  after the name is saved, and the number picker shows the seat route once every
  number is claimed.

## Impact

- Runtime: `js/player.js`; `js/locales/en.js`, `js/locales/ru.js`,
  `js/locales/az.js`.
- Tests: `scripts/browser-check.mjs` (player handoff regression).
- Docs: `SPEC.md` `/player` description; `sw.js` regenerated after the runtime
  asset change.
- No engine, state schema, storage or API change.
