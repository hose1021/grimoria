# Proposal

Issue: #219

## Why

Pit-Hag r2998: "If a Demon is created, you may choose any players to kill or to
protect throughout the night." The arbitrary deaths belong to a change that
creates a Demon.

The Pit-Hag's role module nevertheless declared `canKill: true` on its night
step, so a fresh step offered the console death control before any character
was chosen. `recordSvOutcome` did not check `canKill` at all and killed any
named player on any Sects & Violets step. A Storyteller could therefore record
a death for a Pit-Hag that created no Demon, chose a character already in play,
or was drunk or poisoned.

## What Changes

- The Pit-Hag step declares `canKill: false`; the completion sets it to true
  only when the chosen character is a Demon, as the completion already did.
- `recordSvOutcome` rejects any recorded death on a step without `canKill`,
  with the existing `error.51` family. Commands recorded under an earlier
  ruleset keep the deaths they marked, so old journals still replay.
- Two new tests prove the fresh step and the in-play outcome record no death,
  and the earlier ruleset keeps its recorded death.

## Out of Scope

- The existing character change, no-op, impairment, Evil Twin and win behavior.
- The four Sects & Violets Demon steps, whose abilities always allow a death.
