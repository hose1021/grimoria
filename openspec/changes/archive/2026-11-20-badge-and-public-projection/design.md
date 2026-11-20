# Design

## Two true states

`isImpaired` answers "does the ability fail", not "which impairment". The seat
projection now answers the two questions separately:

- drunk: an active `drunk` effect on the player, or the `drunk` role itself;
- poisoned: an active `poison` effect on the player.

A poisoned drunk player is both, which is what the Storyteller must see. The
badge list adds each true state; the old `else if` turned the pair into one.

## One public projection

`publicSnapshot` duplicated `publicGameView`. Deleting it and pointing its
privacy tests at `publicGameView` removes a drift risk and keeps the same
assertions. `publicRoleView` and the hidden `RoleCard` mode had no production
caller; removing them removes surfaces that no privacy review could reach.
