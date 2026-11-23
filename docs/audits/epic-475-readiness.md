# Epic #475 readiness and decision log

Updated 2026-11-23. Integration PR #476 is merged; the verified-jinx follow-up is PR #477 (`feat/verified-jinxes` → `dev`), CI green at 5824197. Authority: [issue #475](https://github.com/hose1021/grimoria/issues/475).

## Decision log

| #   | Decision                                                                     | Why                                                                                          | Evidence                                                                         |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | A script is data: `ScriptDefinition` plus one compatibility verdict          | A script id must not select an engine, and saved data must not claim support the build lacks | `docs/adr/0003-script-agnostic-engine.md`; `src/core/model/script-definition.ts` |
| 2   | The verdict is the weakest of role support and registered interaction status | Keeps the existing audited levels and makes a missing pair behavior visible                  | `src/core/model/support.ts`, `src/core/model/interactions.ts`                    |
| 3   | A certified mixed script composes the TB, BMR and S&V role-step builders     | Reuses every existing role declaration and key instead of writing a second engine            | `src/core/engine/night.ts` `buildMixedNightQueue`                                |
| 4   | Exact single-edition scripts keep their own builder                          | Step keys embed the compressed edition index; changing them would break saved journals       | `src/core/engine/mixed.test.ts`; full existing suites                            |
| 5   | Completion stays per step, not per script                                    | `step.bmr`/`step.sv` already select the existing adapter                                     | `src/core/engine/night.ts` `completeStep`                                        |
| 6   | All seven official jinxes are behavior-tested and `verified`                 | Membership alone was never enough; each pair now has a source and a test                    | `src/core/model/interactions.ts`; `src/core/engine/jinxes.test.ts`               |
| 7   | Manual-only is the explicit fallback only for an `unsupported` verdict       | A certified pool must not silently downgrade, and an uncertified one must not silently run   | `src/core/engine/setup.ts`, `state.ts`, `bag.tsx`                                |
| 8   | No `pg.game.v4` or `RULESET_VERSION` change                                  | No released journal can contain an automatic mixed script, and no storage shape changed      | `docs/adr/0003-script-agnostic-engine.md` "Migration and rollback"               |
| 9   | The official nightsheet is the one mixed order source                        | It preserves each edition's projection and gives one order for any pool                      | `src/core/model/night-order.ts`; `night-order.test.ts`                           |

## Readiness matrix

| Milestone                                | State                                          | Evidence                                                                                                      |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| M0 discovery, ADR, preservation baseline | Complete                                       | `docs/adr/0003-script-agnostic-engine.md`; edition-gate audit; `npm test` 1557/1557                           |
| M1 `ScriptDefinition` and compatibility  | Complete                                       | `script-definition.ts`, `interactions.ts`, `night-order.ts`, focused tests                                    |
| M2 universal composition                 | Complete for certified pools                   | `buildMixedNightQueue`, composed conditional steps, `mixed.test.ts`, replay                                   |
| M3 interaction registry                  | Complete                                       | Seven pairs registered and `verified`, each with its pinned source and asserting test; `jinxes.test.ts`       |
| M4 production UI                         | Complete                                       | Bag, secrets and help diagnostics; `mixed-script` browser check at 390 px                                     |
| M5 independent certification             | Complete for the jinx scope                    | Rules/compliance: three audit rounds, final ACCEPT at `c50c1e8`; UI/privacy: PASS; see `docs/audits/verified-jinx-independent-audits.md`; PR #477 owner review remains |
| Al vs Al                                 | Not started, by scope; blocked on roster       | `docs/audits/al-vs-al-readiness.md` records the missing roster/source and the exact separate work items     |

## Preservation evidence

- `npm test`: 1580/1580 pass.
- `npm run verify`: typecheck, lint, format, tests, build, fallback, offline,
  type policy, ownership, official provenance, acceptance, version and ledger
  pass.
- `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts
  --scope=all`: 523 official rules, 172 engine rules, 87 UI contracts, 0 known
  findings.
- `openspec validate --changes --strict`: 28/28; `openspec validate --specs --strict`: 27/27.
- `PG_BROWSER_CHECK=mixed-script node scripts/browser-check.ts`: pass at
  390 px; certified pool is automatic, the explicit `manualOnly` fallback is
  manual. The pair-naming branch is not reachable while all seven registered
  jinxes are verified; it is covered by the interaction registry tests, not by
  a live unsupported pair.
- `npm run scenarios` on the `/pocket/` build: 10/10 pass (with `BASE_PATH=/pocket/` for the fallback and offline artifacts).
- `npm run verification:mutation`: 10/10 critical mutations detected.
- Full `node scripts/browser-check.ts`: 37/37 pass, including `mixed-script`.
- `node scripts/run-scenarios.ts languages`: pass (RU/EN/AZ).

## Independent audit findings (fixed)

| Finding                                                                      | Fix                                                                                    | Regression test           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------- |
| The Scarlet Woman inherited from a non-Imp Demon became the Imp              | `becomeDemon` keeps the dead Demon's own character; the death capability passes it     | `MIXED-SUCCESSION-01`     |
| The No Dashii poisoned a Soldier or a Monk-protected player                  | `reconcileNoDashiiPoison` skips protected targets                                      | `MIXED-PROTECTION-01`     |
| A Drunk shown an S&V townsfolk got no step                                   | The S&V builder uses `effectiveRoleId` for non-Demon holders                           | `MIXED-DRUNK-01`          |
| The membership-only `lookupJinx` still returned `verified`                   | Removed; the interaction registry is the only status source                            | `support.test.ts`         |
| A mixed safety test asserted the lifecycle guard, not the compatibility gate | A fresh setup state now asserts the start refusal                                      | `MIXED-SAFETY-01`         |
| Audit and source docs said mixed scripts are rejected                        | Updated `rules-sources.md`, `rules-matrix.md`, the Monk/Soldier exceptions and the ADR | `check-acceptance`, gates |
| The Lunatic mark was re-added after the Mathematician cleared it             | The mark now runs only on the acting Demon's completed step                            | `JINX-LUNATIC-03`         |
| A Lunatic killed before waking still marked the Demon's attack              | A skipped or blocked Lunatic step is not compared                                      | `JINX-LUNATIC-04`         |
| The Sage forced a Recluse registration when the pair named the real Demon   | Register only when the pair contains no actual Demon; no register for Vortox/impaired  | `JINX-SAGE-02`            |
| The Sage registration was journaled twice                                    | One step registration, one generic journal line                                        | `JINX-SAGE-02`            |
| A Drunk given a true scalar answer was still marked ABNORMAL                 | Compare the scalar answer with the true one; a true answer does not mark               | `JINX-DRUNK-03`           |
| The Lunatic compared deaths, not the Demon's chosen target                   | Store the chosen target when the Lunatic jinx can run and compare choices              | `JINX-LUNATIC-05`, `JINX-LUNATIC-06` |
| A Drunk with true prepared one-of-two information was marked                 | Compare the prepared role and pair; a matching answer does not mark                    | `JINX-DRUNK-04`           |
| A Drunk's one-of-two truth was record equality, not the pair                  | Check whether a pair player registers as the named character; the synthetic default is false | `JINX-DRUNK-05`, `JINX-DRUNK-06` |
| The impaired and Vortox Sage guards had no test                             | Add the Vortox, impaired and existing-registration cases                               | `JINX-SAGE-03`, `JINX-SAGE-04`, `JINX-SAGE-05` |

## Residual risks and blockers

1. **No official jinx remains unimplemented.** The remaining unsupported
   mechanics are unknown characters and any future pair without a behavior and
   an asserting test.
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
7. **Out-of-order command completion.** The command path permits the Demon step
   before the Lunatic step; the Lunatic mark is then not written. The UI only
   exposes the current step, so this is not reachable in the app; it stays a
   tracked engine-contract follow-up.
8. **Drunk shown a player-pair role.** A Drunk shown the Sage has no prepared
   true record to compare and is marked unconditionally. The ADR documents the
   limitation; no player-pair true-answer claim is made.

## Separate follow-up scopes

- A verified mixed-script roster expansion with an independent pair oracle.
- Al vs Al roster, sources and interactions.
- Full Playwright and independent rules acceptance on the follow-up head.
