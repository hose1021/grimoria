# Design

## Context

`night.ts` writes `state.setup.grandmotherId = targets[0]` on the first night
without a team check. `appendBmrConditionalSteps` detects a Demon-caused death
of the stored grandchild and inserts a `note.bmr.grandmotherDeath` step, but
`completeBmrStep` only logs. `recordBmrOutcome` rejects a recorded death that
is not among the step's chosen targets, and the step targets nobody.

## Decision

- The first-night branch checks `roleTeam` of the target's real role and returns
  `error.grandchild` before any write. The key is added to `en`, `ru` and `az`.
- `appendBmrConditionalSteps` calls `kill(state, grandmother.id, "ability",
  currentAt(state), { ability: "grandmother", bmr: true })` after inserting the
  note step. `kill` applies protection, the Fool, the Tea Lady, the Innkeeper
  and impairment bookkeeping, so the shared mechanics stay the only death path.
- The note step's `canKill` becomes false, matching the Pukka's resolved-death
  pattern.

## Risks / Trade-offs

- The Grandmother can be protected from this death by an Innkeeper or the Fool.
  That follows the shared "can't die" wording; the pinned page does not exclude
  it.
- The note step remains after a protected death; the log says the ability
  triggered and no death occurred.

## Test plan

- `bmr.test.ts`: the existing Grandmother fixture now asserts her death.
- `bmr.test.ts`: the evil target is rejected and the good target is stored.
- Full `npm test`, `npm run typecheck`, acceptance, OpenSpec checks.
