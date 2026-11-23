# Design

## One comparison, two possible closers

The Lunatic acts before the Demon (Lunatic r3112). The comparison is therefore
resolved when the second of the two completed steps finishes:

- The Lunatic step already completed: the Demon step resolves it, as today.
- The Demon step already completed: the Lunatic step resolves it.

The second resolver is guarded by the Mathematician step. Once the
Mathematician has completed, its clear has consumed the night's ledger; a later
Lunatic completion must not add a mark to the next cycle. This is the same
invariant `JINX-LUNATIC-03` already protects.

No pending flag is added. The resolver reads only completed queue steps, so a
journal replays the same order and writes the same marks.

## The completed step is the fact

The old gate required the Demon actor to be alive when the step completed. An
Imp may choose itself (Imp r3116), so the ability acted and then the actor died.
A skipped or blocked step remains excluded; a completed step is not.

If the Demon dies and good wins, the mark is written before the game state is
observed and remains deterministic. The Mathematician would not wake in a
finished game.

## The Sage's true pair set

`Sage r3009`: "If the Demon kills you, you learn that it is 1 of 2 players."
`Recluse r3007` + the Sage jinx: "The Recluse might register as the Demon to
the Sage." The true set is every pair containing the Demon that killed the Sage
or an unimpaired Recluse. It is independent of impairment and of Vortox; those
change the legal answer, not the truth.

The answer and the Drunk truth check share one helper, so the two cannot drift.

## Drunk shown the Sage

`Drunk r3165`: the Drunk wakes as the Townsfolk they think they are and may be
given false information. The death-triggered Sage step therefore exists for a
Drunk whose shown role is Sage. The pair is a host answer with every pair
legal. The Mathematician+Drunk jinx marks it only when the pair is outside the
true set.

The implied Recluse registration belongs to the real Sage's ability. A Drunk
has no Sage ability, so no registration is recorded and the step keeps only the
pair answer.

## Replay

The registration is derived from the recorded pair, the death record and the
effect graph. `replay` reapplies the journaled pair command, so the derived
registration and its single host-choice line are identical. No new stored
field is added for an existing journal.

## Migration

The Demon flag is new on a typed attack death. A recorded journal from before
this change has the attacker but no `demon`; replay must not add one or it
would queue a Sage step that the saved game did not have.
`DEMON_ATTACK_SOURCE_RULESET_VERSION` marks the first command version that
writes the flag. `recordsDemonAttackSource` keeps every earlier version
without it. `JINX-SAGE-07` builds an old-version Imp-kills-Sage journal and
replays it to the same canonical state.

## Verification

- RED: each new test fails on `origin/dev`.
- GREEN: the focused engine suite, then `npm test`, `npm run verify`, strict
  OpenSpec, gates, mutation, scenarios and Playwright on the branch head.
