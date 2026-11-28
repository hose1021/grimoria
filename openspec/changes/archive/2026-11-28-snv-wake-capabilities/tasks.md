# Tasks

## 1. Evidence

- [x] 1.1 Read the Philosopher r2421, Seamstress r1999 and Witch r2682 wake rules and the existing `nightStep`/actor behavior.
- [x] 1.2 Add a focused role test for each module and record it failing against the legacy declaration.

## 2. Implementation

- [x] 2.1 Declare each role's step through a `night-step` capability with `timing: "any"`; keep the same `step`, `optional`, `infoKind` and `actor`.
- [x] 2.2 Leave the resolver absent so the engine keeps the S&V wake, answer and curse paths.
- [x] 2.3 Regenerate the ownership ledger and the verification test manifest.

## 3. Verification

- [x] 3.1 `npm test` — 1430/1430 (baseline 1424 + 6 new).
- [x] 3.2 `npm run typecheck` — pass.
- [x] 3.3 `npm run format:check` — pass.
- [x] 3.4 `npm run verify` — pass.
- [x] 3.5 `node --test scripts/role-ownership.test.ts` — 22/22.
- [x] 3.6 `node scripts/check-acceptance.ts`, `node scripts/openspec-check.ts`, `openspec validate --changes --strict` — pass.
- [x] 3.7 `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` — pass.

## Evidence

- RED: `node --test src/core/roles/philosopher/role.test.ts src/core/roles/seamstress/role.test.ts src/core/roles/witch/role.test.ts` -> 6 tests, 3 pass, 3 fail. The three declaration tests fail with `actual: { kind: undefined, timing: undefined }`: the modules still declare the legacy `nightStep` and expose no `night-step` arm.
- GREEN: the same command -> 6 tests, 6 pass, 0 fail. The step shape, optional flag, information kind, actor predicate and night-1/later-night behavior are unchanged; no resolver is declared.
- GREEN: `node --test src/core/engine/snv.test.ts src/core/roles/night-step.test.ts` -> 231 tests, 231 pass. The printed-order check accepts `timing: "any"` for all three and every existing wake, answer and curse test stays green.
- GREEN: `npm test` -> 1430 tests, 1430 pass, 0 fail. `npm run typecheck` and `npm run format:check` pass; `npm run verify` passes; `node --test scripts/role-ownership.test.ts` -> 22/22; `node scripts/check-acceptance.ts` passes; `openspec validate --changes --strict` reports the change valid; `node scripts/openspec-check.ts` passes; `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` passes.
