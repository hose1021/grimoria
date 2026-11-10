# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add a BMR test where night N poisons A and night N+1 the healthy Pukka chooses itself; assert A is alive and healthy, the Pukka is poisoned, A keeps a suspended death, and no death is recorded. Verify with `node --test --test-name-pattern="Pukka chooses itself" js/bmr.test.mjs`; it must fail before the fix.
- [x] 1.2 Add a BMR test where the self-poisoned Pukka acts on the next night; assert no new poison, no death, and both suspended effects remain. Verify with `node --test --test-name-pattern="self-poisoned Pukka" js/bmr.test.mjs`; it must fail.
- [x] 1.3 Add a BMR test that removes the self-poison before the next Pukka step; assert A dies immediately and the paired effects clear. Include a game-over case where that death satisfies a win condition, and assert preview and apply report the same winner. Verify with the targeted test; it must fail.
- [x] 1.4 Add a BMR test where the recovered Pukka chooses B; assert B is poisoned first, the Pukka dies as the previously poisoned target, and preview matches apply. Verify with the targeted test; it must fail.
- [x] 1.5 Add command tests for valid sequential mutual poisoning, a same-night mutual cycle, a three-source cycle, and the reversed `state.effects` array; assert `CYCLIC_EFFECT_DEPENDENCY`, byte-identical state and identical results from validate, preview and apply. Verify with `node --test --test-name-pattern="poison" js/commands.test.mjs`; the cycle tests must fail with the current stack overflow or untyped error.
- [x] 1.6 Add store tests that import a cyclic game and assert `CYCLIC_EFFECT_DEPENDENCY` with the current game and storage key unchanged; add a load test that keeps a cyclic saved value under the backup key; add a valid sequential mutual poison import that succeeds. Verify with `node --test --test-name-pattern="cyclic" js/store.test.mjs`; it must fail.
- [x] 1.7 Record the RED command and the failing test names in the Evidence section before implementation.

## 2. GREEN: deterministic poison resolution

- [x] 2.1 Add a pure effect-graph helper that returns active effect ids or `CYCLIC_EFFECT_DEPENDENCY`, uses `cycleOf(start)` grouping and effect ids as tie-breaks, and ignores array order. Verify with the command order-independence test and a direct helper unit check.
- [x] 2.2 Replace the recursive poison source check in `effectActive` and `isImpaired` with the helper result; keep the existing drunk, expiry, dead-source and no-ability behavior. Verify with the existing TB and BMR effect tests plus the new order tests.
- [x] 2.3 Call the helper in `runDraft` before invariant checks; return a rejected outcome with `errorCode: "CYCLIC_EFFECT_DEPENDENCY"`, the involved effect ids and the original state. Verify the validate, preview and apply cycle tests pass and the state stays byte-identical.

## 3. GREEN: Pukka self-target

- [x] 3.1 Add optional `suspended` and `resumeOnHealthy` fields to `pukka-death` effects; absent values keep old saves valid. Verify the existing export/import Pukka test still passes.
- [x] 3.2 Implement the self-target branch: apply the new self-poison first, suspend the previous pending death with `resumeOnHealthy`, deactivate the previous Pukka poison, and record no death. Verify task 1.1 passes.
- [x] 3.3 Mark due Pukka deaths as `suspended: "impaired"` when the source is impaired, and resolve only non-resume due deaths at a healthy Pukka step. Verify the existing drunk-Pukka and Exorcist tests plus task 1.2 pass.
- [x] 3.4 Add `resolveSuspendedPukkaDeaths` and run it at the end of each successful draft; resolve `resumeOnHealthy` deaths when the source is healthy, call `kill`, clear paired effects and run `checkWin`. Verify tasks 1.3 and 1.4 pass.
- [x] 3.5 Keep the Pukka result and `future.delayedEffects` projections accurate: suspended deaths expose their state and due night; preview and apply derive the same events. Verify the preview/apply parity tests.

## 4. GREEN: import and load rejection

- [x] 4.1 Run the chronology-aware cycle check in `validateState` after structural validation and return a typed failure from `importGame` with `errorCode: "CYCLIC_EFFECT_DEPENDENCY"`. Verify task 1.6 import tests pass.
- [x] 4.2 Keep the current game and the storage key unchanged on a rejected import; treat a cyclic saved state as corrupt and keep the raw value under the existing backup key. Verify the store tests and the existing corrupt-save test pass.

## 5. REFACTOR

- [x] 5.1 Remove now-duplicated source-health checks from `effectActive`, `isImpaired` and `resolvePukkaDeath` so one resolver owns poison activity; rerun all effect, Pukka and command tests.
- [x] 5.2 Simplify the Pukka pending selection and suspension flags into one documented helper; verify the self-target, impaired, Exorcist, protection and repeated-target tests still pass.
- [x] 5.3 Check for dead branches, stale comments and unused imports introduced by the change; rerun the full suite after cleanup.

## 6. Verification and documentation

- [x] 6.1 Run `node --test js/*.test.mjs` and record the full pass count.
- [x] 6.2 Run `node scripts/browser-check.mjs` with the project Playwright module and verify the Pukka card, self-target status, no manual death buttons and no console errors.
- [x] 6.3 Update `docs/rules-matrix.md` Pukka rows with self-target, suspension and cycle handling, and update `docs/rules-sources.md`; verify each row cites the new tests and the owner decision.
- [x] 6.4 Run `node scripts/build-offline.mjs` to refresh `sw.js` after the runtime edit and verify the generated cache id.
- [x] 6.5 Run `openspec validate --changes --strict`, `openspec validate --specs --strict` and `node scripts/openspec-check.mjs`; all must pass.
- [x] 6.6 Report the RED and GREEN evidence, changed paths, full test count and browser-check result on PR #24; do not merge.

  Reported: https://github.com/hose1021/pocket-grimoire-go/pull/24#issuecomment-6766503463. No merge was performed.

## Evidence

- RED: `node --test --test-name-pattern="Pukka choosing itself|self-poisoned Pukka|healed Pukka|recovered Pukka" js/bmr.test.mjs` -> 4 tests, 0 pass, 4 fail: "the Pukka choosing itself poisons itself and suspends the previous death", "a self-poisoned Pukka applies no new poison and resolves no suspended death", "a healed Pukka resolves the suspended death immediately and can end the game", "a recovered Pukka dies as the previously poisoned target when it chooses again".
- RED: `node --test --test-name-pattern="cyclic|sequential mutual|three-source|order" js/commands.test.mjs` -> `ERR_MODULE_NOT_FOUND: js/effect-graph.js`; the deterministic cycle rejection path does not exist.
- RED: `node --test --test-name-pattern="cyclic|sequential mutual" js/store.test.mjs` -> 3 tests, 1 pass, 2 fail: "cyclic effect imports are rejected without touching the current game or disk" and "a cyclic saved game is backed up as corrupt and is not overwritten".
- GREEN: `node --test js/*.test.mjs` -> 191 tests, 191 pass, 0 fail. Browser checks passed: phone/tablet, night/day, Virgin, route cleanup, privacy, reload, cross-tab, languages, role-sheet scenario filters, offline project-subpath reload, safe PWA update. `sw.js` cache `pg-static-c5e4da3fc359ed96`, 424 assets. `openspec validate --changes --strict`, `openspec validate --specs --strict` and `node scripts/openspec-check.mjs` pass.
- Changed: `js/effect-graph.js` (new), `js/engine/effects.js`, `js/engine/commands.js`, `js/engine/bmr.js`, `js/model.js`, `js/bmr.test.mjs`, `js/commands.test.mjs`, `js/store.test.mjs`, `docs/rules-matrix.md`, `docs/rules-sources.md`, `sw.js`.
