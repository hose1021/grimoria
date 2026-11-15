# Proposal

Issue: #219

## Why

Barber r1757: "If you died today or tonight, the Demon may choose 2 players…
to swap characters." Two unpinned gaps in the gate:

- "If a player dies then becomes the Barber, the Demon may not swap two
  players' characters tonight." The engine only checked *when* the player died,
  not that they held the Barber at that death.
- States r1039: "A drunk or poisoned player has no ability." A Barber who died
  drunk still enabled the swap.

The death record already stores the role and the impairment at the death.

## What Changes

- Add `deathAsRecently(state, playerId, roleId)`: the recent death recorded
  while the player held that role, with its impairment.
- The Barber actor uses it: no step unless the death record names the Barber and
  the death was sober.
- Two RED → GREEN tests and their evidence rows.

## Out of Scope

- The multi-Demon Chooser finding (needs a new command option and owner review).
- Any other death-triggered role.
