# Proposal

Issue: #19
Parent: #19, Storyteller UX and safety of play.

## Why

Madness penalties are intentionally Storyteller decisions and the engine records them, but the day screen does not surface active Cerenovus or Mutant madness. The Storyteller can end the day without reviewing any affected player, so a valid judgment can be forgotten.

## What Changes

- Show each active madness target on the day card with the character or condition and an explicit Storyteller review.
- Offer the legal outcomes: execute with a reason, or record that no penalty is being applied with a reason.
- Allow a no-penalty review to be upgraded to an execution later in the same day if new evidence changes the Storyteller's judgment.
- Block the day-to-night transition while any active madness target has not been reviewed for that day.
- Keep the rule judgment manual; the engine does not infer whether a player broke madness.

## Capabilities

### Modified Capabilities

- `game/sects-and-violets`: require a recorded Storyteller review for each active madness effect before ending the day.
- `app/ui-and-privacy`: show the host-only madness review and its pending state on the day card.

## Impact

Core S&V/day transition, the application table projection, the storyteller day card, locale catalogs, engine/UI tests and browser smoke checks. No save migration is needed; review fields already live on the madness effect.
