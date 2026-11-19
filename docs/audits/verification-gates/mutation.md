# Mutation probes

`scripts/verification/mutation.ts` copies the worktree to a temporary directory,
symlinks `node_modules`, runs each probe's suite once to prove a green baseline,
applies one mutation, runs the targeted test, restores the file, and removes the
copy. The source worktree is never mutated.

A probe counts only when the runner reports a real assertion. The runner fails
the job as:

- `MUTATION_BASELINE_FAIL` when the suite is not green before the mutation;
- `SURVIVED` when the mutated suite still passes;
- `MUTATION_INVALID` when the mutated suite fails without an assertion
  diagnostic (a loader error, a syntax error or a missing module is not
  detection).

Each `DETECTED` line carries the failing test name and the first line of its
assertion, so the evidence names what failed, not only that something failed.

| Probe | Mutation | Test |
|---|---|---|
| poison projection | `seatProjection.poisoned` → `false` | `src/application/read-models/verification.test.ts` |
| given gate | `stepContext.needsGiven` → `false` | `src/ui/screens/table/step-context.verification.test.ts` |
| registered-dead public count | remove the `!registeredDead` filter | `src/application/read-models/read-models.test.ts` |
| consequence revival | `revived` → `death` | `src/ui/screens/table/helpers.test.ts` |
| empath count inversion | count non-evil neighbours | `src/core/roles/empath/role.test.ts` |
| impairment silenced | `isImpaired` → `false` | `src/core/engine/engine.test.ts` |
| phase guard disabled | `lifecycleGuard` always returns `null` | `src/core/engine/lifecycle.test.ts` |
| demon-dead win silenced | the good win on a dead Demon → `null` | `src/core/engine/engine.test.ts` |
| player projection leak | add `roleId` to the handoff projection | `src/ui/screens/player-projection.test.ts` |

The run log for a given commit is posted on the pull request as a comment,
because a log that names its own commit SHA cannot be committed inside that same
commit without changing it.

This is not a mutation score for the 145 `verified` engine rows. The probes cover
one information generator, one impairment predicate, one lifecycle guard, one win
condition and five projections. A per-row campaign belongs to the scheduled job
and must not be reported as coverage.
