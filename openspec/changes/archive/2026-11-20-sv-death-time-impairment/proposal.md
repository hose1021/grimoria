# Proposal

Issue: #219

## Why

States r1039: "If an ability is triggered or used when the player is drunk or
poisoned, the ability is wasted." The triggering moment is the death, not the
later choice or night slot. Two S&V abilities read the live effect graph at the
later moment, so a player who was poisoned at death but healthy later still
used the ability:

- Sweetheart r2704: "When you die, 1 player is drunk from now on." Example in
  States: a poisoned Sweetheart "does not make a player drunk, even if the
  Sweetheart becomes healthy later on."
- Klutz r1758: the public choice that loses the game is an ability that
  triggered at death.

The death record already stores `impaired` at the death. The fix uses it.

## What Changes

- Add `failedAtDeath`, which reads the latest death record's impairment with
  the live graph as a fallback for legacy saves.
- The Sweetheart and Klutz use it instead of the current effect graph.
- The existing drunk-Klutz fixture now applies the drunk before the death,
  which matches the rule timing.

## Out of Scope

- Other roles whose impairment is evaluated at their own wake, where the wake
  is the trigger.
- The "becomes healthy later" interaction for any role other than these two.
