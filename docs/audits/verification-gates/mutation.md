# Mutation probes

`scripts/verification/mutation.ts` copies the worktree to a temporary directory,
symlinks `node_modules`, runs each probe's suite once to prove a green baseline,
applies one mutation, runs the targeted test, restores the file, and removes the
copy. The source worktree is never mutated. A suite that is already red is
reported as `MUTATION_BASELINE_FAIL`: a failure caused by a broken baseline is
not detection.

| Probe | Mutation | Test |
|---|---|---|
| poison projection | `seatProjection.poisoned` → `false` | `src/application/read-models/verification.test.ts` |
| given gate | `stepContext.needsGiven` → `false` | `src/ui/screens/table/step-context.verification.test.ts` |
| registered-dead public count | remove the `!registeredDead` filter | `src/application/read-models/read-models.test.ts` |
| consequence revival | `revived` → `death` | `src/ui/screens/table/helpers.test.ts` |
| empath count inversion | count non-evil neighbours | `src/core/roles/empath/role.test.ts` |
| impairment silenced | `isImpaired` → `false` | `src/core/engine/engine.test.ts` |
| phase guard disabled | `lifecycleGuard` always returns `null` | `src/core/engine/lifecycle.test.ts` |
| player projection leak | add `roleId` to the handoff projection | `src/ui/screens/player-projection.test.ts` |

Result: **8/8 detected** on this branch. A surviving mutation fails the job.

This is not a full mutation score. The probes cover one information generator,
one engine status predicate, one lifecycle guard and five projections. The 145
`verified` engine rows do not each have a probe; a per-row campaign belongs to
the scheduled job and must not be reported as coverage.
