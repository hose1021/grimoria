# Design

## Context

`bagErrors` is the one validator behind `setupErrors`, the bag screen, the
official presets, the custom suggestions and `repairBag`. It already rejected a
Drunk mask that was missing, of another team, outside the script or in play, and
a Drunk mask reused as a bluff. The Lunatic had a stored mask
(`setup.lunaticShownId`, shown by `dealGame` to the player) but the validator
ignored it.

## Decisions

- **The mask is validated by `bagErrors`.** That keeps one validation path for
  the direct setup, presets, suggestions, repairs and the dealt-game guard. A
  caller that does not model the mask (the older thrown-together test fixtures)
  omits the field and skips the check; the setup state always passes it, so the
  screens cannot deal an impossible mask. This is why the option is
  `lunaticShownId?: RoleId | null` without a default: `null` means "a Lunatic
  is in play but no mask was chosen" and is rejected; `undefined` means "this
  caller does not track the mask".
- **Stable reason codes** (`lunatic-shown`, `lunatic-team`,
  `lunatic-outside-script`, `lunatic-unused`, `bluffs-lunatic`) mirror the Drunk
  codes. The screen never invents a reason; it renders the returned message.
- **Mask exclusion is a bluff rule, not a UI filter.** A Drunk mask is a
  Townsfolk, so it could otherwise be dealt as a bluff and leak; the Lunatic
  mask is a Demon, so the good-team rule already rejects it, but the dedicated
  code keeps the intent explicit and testable. Both masks are absent from
  `publicGameView`, which carries only phase, counts, announced deaths and the
  winner.
- **No script relaxation.** The change does not touch `parseScript`,
  `validateState` or `setupErrors`'s mixed-edition rule; the new tests assert
  the existing limits so a future setup change cannot quietly drop them.

## Risks

- The BMR test fixture builder previously filled a bag from the team pools and
  dealt it; at 9+ players that can include the Lunatic. The fixture now selects
  the in-play Demon as the mask, exactly like `normalizeBag`. A real save
  written before the rule has `lunaticShownId: null` only when the Lunatic was
  never normalized; `importGame` validates the field as an in-script role, and
  the setup screen fills it on the next `bagUpdate`.
