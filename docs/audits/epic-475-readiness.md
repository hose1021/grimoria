# Epic #475 readiness and decision log

Updated 2026-11-23. Integration PR: #476 (targets `dev`). Authority: [issue #475](https://github.com/hose1021/grimoria/issues/475).

## Decision log

| #   | Decision                                                                     | Why                                                                                          | Evidence                                                                         |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | A script is data: `ScriptDefinition` plus one compatibility verdict          | A script id must not select an engine, and saved data must not claim support the build lacks | `docs/adr/0003-script-agnostic-engine.md`; `src/core/model/script-definition.ts` |
| 2   | The verdict is the weakest of role support and registered interaction status | Keeps the existing audited levels and makes a missing pair behavior visible                  | `src/core/model/support.ts`, `src/core/model/interactions.ts`                    |
| 3   | A certified mixed script composes the TB, BMR and S&V role-step builders     | Reuses every existing role declaration and key instead of writing a second engine            | `src/core/engine/night.ts` `buildMixedNightQueue`                                |
| 4   | Exact single-edition scripts keep their own builder                          | Step keys embed the compressed edition index; changing them would break saved journals       | `src/core/engine/mixed.test.ts`; full existing suites                            |
| 5   | Completion stays per step, not per script                                    | `step.bmr`/`step.sv` already select the existing adapter                                     | `src/core/engine/night.ts` `completeStep`                                        |
| 6   | All seven official jinxes are `unsupported` until a behavior and test exist  | The old table reported `verified` from membership alone; #475 forbids that                   | `src/core/model/interactions.ts`; `script-definition.test.ts`                    |
| 7   | Manual-only is the explicit fallback only for an `unsupported` verdict       | A certified pool must not silently downgrade, and an uncertified one must not silently run   | `src/core/engine/setup.ts`, `state.ts`, `bag.tsx`                                |
| 8   | No `pg.game.v4` or `RULESET_VERSION` change                                  | No released journal can contain an automatic mixed script, and no storage shape changed      | `docs/adr/0003-script-agnostic-engine.md` "Migration and rollback"               |
| 9   | The official nightsheet is the one mixed order source                        | It preserves each edition's projection and gives one order for any pool                      | `src/core/model/night-order.ts`; `night-order.test.ts`                           |

## Readiness matrix

| Milestone                                | State                                          | Evidence                                                                                                      |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| M0 discovery, ADR, preservation baseline | Complete                                       | `docs/adr/0003-script-agnostic-engine.md`; edition-gate audit; `npm test` 1557/1557                           |
| M1 `ScriptDefinition` and compatibility  | Complete                                       | `script-definition.ts`, `interactions.ts`, `night-order.ts`, focused tests                                    |
| M2 universal composition                 | Complete for certified pools                   | `buildMixedNightQueue`, composed conditional steps, `mixed.test.ts`, replay                                   |
| M3 interaction registry                  | Complete as classification; behaviors deferred | Seven pairs registered and `unsupported` with reasons; no pair claims behavior                                |
| M4 production UI                         | Complete                                       | Bag, secrets and help diagnostics; `mixed-script` browser check at 390 px                                     |
| M5 independent certification             | Partial                                        | Focused browser proof, full Playwright suite and full-game scenarios pass; independent audit result in the PR |
| Al vs Al                                 | Not started, by scope                          | Needs a separate roster/source issue after the foundation is accepted                                         |

## Preservation evidence

- `npm test`: 1557/1557 pass.
- `npm run verify`: typecheck, lint, format, tests, build, fallback, offline,
  type policy, ownership, official provenance, acceptance, version and ledger
  pass.
- `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts
  --scope=all`: 523 official rules, 172 engine rules, 87 UI contracts, 0 known
  findings.
- `openspec validate --changes --strict`: 27/27; `openspec-check`: 27 specs,
  27 active changes.
- `PG_BROWSER_CHECK=mixed-script node scripts/browser-check.ts`: pass at
  390 px; certified pool is automatic, the jinxed pool is manual and names the
  unimplemented pair.
- `npm run scenarios` on the `/pocket/` build: 10/10 pass.
- Full `node scripts/browser-check.ts`: pass, including the new `mixed-script`
  case and the updated mixed automatic-mode assertion.

## Independent audit findings (fixed)

| Finding                                                                      | Fix                                                                                    | Regression test           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------- |
| The Scarlet Woman inherited from a non-Imp Demon became the Imp              | `becomeDemon` keeps the dead Demon's own character; the death capability passes it     | `MIXED-SUCCESSION-01`     |
| The No Dashii poisoned a Soldier or a Monk-protected player                  | `reconcileNoDashiiPoison` skips protected targets                                      | `MIXED-PROTECTION-01`     |
| A Drunk shown an S&V townsfolk got no step                                   | The S&V builder uses `effectiveRoleId` for non-Demon holders                           | `MIXED-DRUNK-01`          |
| The membership-only `lookupJinx` still returned `verified`                   | Removed; the interaction registry is the only status source                            | `support.test.ts`         |
| A mixed safety test asserted the lifecycle guard, not the compatibility gate | A fresh setup state now asserts the start refusal                                      | `MIXED-SAFETY-01`         |
| Audit and source docs said mixed scripts are rejected                        | Updated `rules-sources.md`, `rules-matrix.md`, the Monk/Soldier exceptions and the ADR | `check-acceptance`, gates |

## Residual risks and blockers

1. **Seven jinx behaviors are missing.** A mixed pool containing any of them is
   `unsupported` and needs the explicit manual fallback. Implementing them is a
   separate source-backed change per pair.
2. **Per-role completion adapters remain in the edition files.** A new
   character still needs its adapter until the existing #211 migration moves
   that role; this change removed the script-level engine choice, not the
   remaining role branches.
3. **Generic cross-edition mechanics are covered by role tests, not by an
   exhaustive pair oracle.** Protection, impairment, death, registration,
   information falsification and transformation stay in shared mechanics; the
   registry contains only pair-owned rules. The audit exposed three mixed-only
   gaps, now fixed with tests; a future shared-mechanic gap must be fixed in that
   mechanic, and a pair-owned rule must be registered, not inferred.
4. **A script's certification is pool-level.** A jinx pair in the pool makes the
   whole script uncertified even when that pair was not dealt. This is
   conservative and intentional.
5. **Al vs Al is not implemented.** The foundation is ready for a separate
   roster and source review; no experimental character is added here.
6. **Travellers, Fabled and Loric remain out of scope.**

## Separate follow-up scopes

- One change per jinx pair: behavior, pinned source, asserting test, registry
  status upgrade.
- A verified mixed-script roster expansion with an independent pair oracle.
- Al vs Al roster, sources and interactions.
- Full Playwright and independent rules acceptance on the integration head.
