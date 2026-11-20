# Design

## Context

`roles/barber/role.ts` used `diedRecently`, which checks the death time window
only. `sv-common.ts` holds the shared predicates.

`Death` stores `roleId` (the role at death) and `impaired`.

## Decision

```ts
deathAsRecently(state, playerId, roleId)
```

returns the recent death whose `roleId` matches, with `impaired` normalised to a
boolean. The Barber actor returns the candidate only when that record exists and
`impaired` is false. Both `nightStep` and `deathStep` use the same actor.

The actor signature is `(state, night, candidate)`, matching `NightStepSpec`.

## Risks / Trade-offs

- Legacy deaths without a matching role record get no swap; that is safer than
  a false swap.
- The "dies then becomes the Barber" case has no death record as the Barber, so
  the gate is exact.

## Test plan

- `snv.test.ts`: a player executed before becoming the Barber gets no step; a
  Barber killed while drunk gets no step.
- Full `npm test`, typecheck, acceptance, OpenSpec checks.
