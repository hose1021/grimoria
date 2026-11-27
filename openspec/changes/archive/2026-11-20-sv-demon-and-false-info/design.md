# Design

## Context

`recordSvOutcome` is the only kill writer for S&V Demons. It accepted
`deathIds` without checking the actor. The Fang Gu jump tested the target's
team but not `alive`. Six info branches computed
`falsified = impaired || vortoxFalsifies(...)` and filtered `value` out of the
options for both causes.

## Decision

- Add a Demon+impairment guard before the death loop:
  `demon && step.actorId && deathIds.length && isImpaired(...)` returns
  `error.52`. The state is unchanged, like the BMR path.
- Add `target.alive` to the Fang Gu jump condition. A dead target still
  completes the step; the `kill` loop returns no death for it.
- Separate `vortox` from `impaired` in the numeric and yes-no branches. Options
  exclude `value` only when `vortox` is true; impairment alone offers the full
  legal set. The Mathematician already worked this way.

## Risks / Trade-offs

- The guard rejects rather than silently dropping deaths: the host sees why.
- A mixed-edition protected Outsider is still out of scope; supported scripts
  reject mixing and S&V has no protection role.

## Test plan

- `snv.test.ts`: impaired Fang Gu death rejected; dead Outsider no jump;
  impaired Clockmaker options include the true distance.
- Full `npm test`, typecheck, acceptance, OpenSpec checks.
