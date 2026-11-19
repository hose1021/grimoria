# Mutation probes

`scripts/verification/mutation.ts` copies the worktree to a temporary directory, symlinks `node_modules`, applies one mutation at a time, runs the targeted test, restores the file, and removes the copy. The source worktree is never mutated.

| Probe | Mutation | Test |
|---|---|---|
| poison projection | `seatProjection.poisoned` → `false` | `src/application/read-models/verification.test.ts` |
| given gate | `stepContext.needsGiven` → `false` | `src/ui/screens/table/step-context.verification.test.ts` |
| registered-dead public count | remove the `!registeredDead` filter | `src/application/read-models/read-models.test.ts` |
| consequence revival | `revived` → `death` | `src/ui/screens/table/helpers.test.ts` |
| player projection leak | add `roleId` to the handoff projection | `src/ui/screens/player-projection.test.ts` |

Result on the base commit: **5/5 detected**. A surviving mutation fails the mutation job.

This is not a full mutation score. The probes target the selectors/gates that had unit gaps in the audit; a broader mutation campaign belongs to the scheduled job and must not be reported as full coverage.
