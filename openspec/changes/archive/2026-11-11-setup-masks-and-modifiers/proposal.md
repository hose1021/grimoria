# Proposal

Issue: #43
Part of #19, stage 2i.

## Why

The setup screens already build a bag for 5 to 15 players and apply the four
composition modifiers, but the bag validator never checked the Lunatic's shown
Demon. `normalizeBag` filled `setup.lunaticShownId` automatically, so the UI
looked correct while a state with a missing, non-Demon or out-of-script mask
still passed `setupErrors`, `dealGame` and `save`/`load`. The setup table also
had no single test that walks every player count and every modifier, and the
mask exclusion was asserted for the Drunk only.

## What Changes

- `bagErrors` validates `lunaticShownId`: a Lunatic in the bag needs a shown
  Demon, the mask must be a Demon, and it must belong to the selected script;
  a mask without a Lunatic is rejected. Each case returns a stable code and a
  Russian reason.
- The bluff pool rejects the Lunatic mask with its own `bluffs-lunatic` reason,
  next to the existing `bluffs-drunk`.
- `setupErrors` passes the state mask to the validator, and `randomBag`,
  `presetBag`, custom suggestions and `repairBag` derive and pass it, so every
  generated bag stays legal.
- Tests: a table-driven `js/setup.test.mjs` covers every player count 5 to 15 in
  all three scenarios, each modifier and its impossible choice, every bag
  rejection reason, mask exclusion from bluffs and from the public view, and
  the script limits (mixed editions, unknown roles, short rosters, a role
  outside the script).

Out of scope: changing the composition table, adding a new modifier, and the
host-adjudicated abilities of the four modifier characters.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `game/setup`: the composition requirement names the full 5–15 table, the
  modifier requirement names every modifier and its impossible choice, the
  validation requirement adds the Lunatic mask and the script-scoped roles, and
  the bluff requirement adds the Lunatic mask and the public projection.

## Impact

- Code: `src/core/model/rules.ts` (`bagErrors`, `randomBag`),
  `src/core/engine/setup.ts`, `js/presets.js`.
- Tests: new `js/setup.test.mjs` (7 cases); `js/bmr.test.mjs` gains a Lunatic
  step test and its fixture supplies the Lunatic mask.
- Docs: `docs/rules-matrix.md` moves the Lunatic setup row to `verified` and
  records the new coverage; `docs/rules-sources.md` records the mask rule.
