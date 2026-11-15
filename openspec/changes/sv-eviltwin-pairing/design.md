# Design

## Context

`replaceCharacter` set `evilTwinPlayerId = player.id` and searched for a living
good partner. `evilTwinPair` expects the two stored ids to be the good and the
evil twin. A good player turned into the Evil Twin therefore produced a pair of
two good players and the execution win failed.

## Decision

- Determine `holderGood = realTeamOf(player) === "good"`.
- Partner side is the opposite alignment.
- Reuse a stored good twin only when it matches the needed side; otherwise find
  a living player of that side.
- Store `evilTwinGoodPlayerId` from the good side and `evilTwinPlayerId` from the
  evil side, whichever seat each is.

## Risks / Trade-offs

- If no living opposite-alignment player exists, both fields are null and the
  ability is inert. The pinned "choose a new Twin" host decision is not
  modelled; the honest state is no automatic pair.
- Import keeps the stored ids; the resolver does not overwrite a set pair.

## Test plan

- `snv.test.ts`: good holder with an evil partner; evil holder with a good
  partner; executing the good twin wins for evil in both cases.
- Full `npm test`, typecheck, acceptance, OpenSpec checks.
