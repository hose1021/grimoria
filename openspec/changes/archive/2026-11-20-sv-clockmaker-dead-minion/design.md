# Design

## Context

`svInfoForStep` for the Clockmaker used `livingPlayers(state).filter(minion)`.
The Demon must be alive to act; the Minions only need to be in play.

## Decision

Use `orderedPlayers(state)` for the Minion list. The seat math is unchanged:
the shortest ring distance in either direction.

## Risks / Trade-offs

- A dead Minion now extends the answer. That is the pinned "in play" meaning.
- No other role's living filter changes.

## Test plan

- `snv.test.ts`: a dead Minion at seat 2 with the Demon at seat 8 gives distance
  2, not 0.
- Full `npm test`, typecheck, acceptance, OpenSpec checks.
