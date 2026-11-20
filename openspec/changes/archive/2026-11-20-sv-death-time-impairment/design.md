# Design

## Context

`resolveKlutzChoice` and the Sweetheart branch of `completeSvStep` called
`isImpaired` at the choice or step time. A poison that expired between the death
and the step made a wasted ability fire.

`Death` stores `impaired` (written by `kill`). The latest death for a player is
the trigger that matters.

## Decision

```ts
function failedAtDeath(state, playerId) {
  const death = [...state.deaths].reverse().find((entry) => entry.playerId === playerId);
  return typeof death?.impaired === "boolean"
    ? death.impaired
    : isImpaired(state, playerId, currentAt(state));
}
```

Both abilities call it. The fallback keeps old saves without the field working
as before.

## Risks / Trade-offs

- A player who dies more than once uses the latest death; that is the death
  whose ability is resolving.
- The Sweetheart's effect start remains `actor.deadAt`, unchanged.

## Test plan

- `snv.test.ts`: a death-time poison removed before the step suppresses both
  abilities; the existing drunk-Klutz test moves its effect before the death.
- Full `npm test`, typecheck, acceptance, OpenSpec checks.
