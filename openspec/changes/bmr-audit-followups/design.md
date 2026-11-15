# Design

## Context

`roles/chambermaid/role.ts` counted `livingPlayers`, while `completeStep`
rejects a registered-dead target with `error.55`. `day.ts` built the Minstrel
effects from `livingPlayers` after the Minion death. `RESTORED_ON_RESURRECTION`
listed five flags but no Moonchild flag.

## Decision

- Chambermaid: keep the holder check and count other players for whom
  `registersAlive` is true. The module already imports model helpers.
- Minstrel: use `orderedPlayers` for the effect targets. The Minstrel itself is
  excluded; the executed Minion and dead players are included. No other rule
  changes.
- Moonchild: add `moonchildTarget`, `moonchildTargetEvil` and
  `moonchildResolved` to the resurrection reset list.

## Risks / Trade-offs

- Drunk effects on dead players exist in state but have no immediate effect.
  They matter only on resurrection, which the pin covers.
- The Chambermaid wake and the completion check now agree on the legal target
  set.

## Test plan

- `bmr.test.ts`: registered-dead-only choices suppress the step; the Minstrel
  drunk reaches the executed Minion; a regurgitated Moonchild chooses again.
- Full `npm test`, typecheck, acceptance, OpenSpec checks.
