# Tasks

## 1. Traceability

- [x] 1.1 Copy the official-rules and UI-contract audit sources into `docs/audits/verification-gates/`.
- [x] 1.2 Add `scripts/verification/build-trace.ts` and generate `traceability.json` (523 official rules, 166 engine rules, 87 UI contracts).
- [x] 1.3 Add `scripts/verification/test-index.ts` and commit `test-manifest.json`.
- [x] 1.4 Add `scripts/verification/build-uncovered.ts` and commit `uncovered.json`.
- [x] 1.5 Add `scripts/verification/render-matrix.ts` and commit both matrices.

## 2. Gates

- [x] 2.1 Add `scripts/verification/gates.ts` with `verified`, `findings` and `all` scopes.
- [x] 2.2 Add `command-scope.json` with 33 UI, 6 product, 7 internal and 1 missing command.
- [x] 2.3 Add `src/verification/architecture.test.ts` and `contracts.test.ts`.
- [x] 2.4 Add `src/verification/action-reachability.test.ts`.
- [x] 2.5 Add `src/application/read-models/verification.test.ts` and `src/core/engine/model-based.test.ts`.
- [x] 2.6 Add `src/ui/screens/table/step-context.verification.test.ts`; narrow the `stepContext` input to `StepDraftSource` without behavior change.
- [x] 2.7 Add `scripts/verification/findings.test.ts` with the red regressions.
- [x] 2.8 Add `scripts/verification/mutation.ts`.

## 3. CI

- [x] 3.1 Add `.github/workflows/verification.yml` with `semantic`, `findings` and scheduled `mutation` jobs.
- [x] 3.2 Record the red findings job and the no-merge rule in `known-findings.md`.

## 4. Documentation

- [x] 4.1 Add `docs/audits/verification-gates/README.md`, `architecture.md`, `coverage-policy.md`, `ci.md`, `mutation.md` and `known-findings.md`.
- [x] 4.2 Add this OpenSpec change.

## 5. Verification

- [x] 5.1 `npm run typecheck` passes.
- [x] 5.2 `npm test` passes (1284 tests on the base + new verified tests).
- [x] 5.3 `node scripts/verification/gates.ts --scope=verified` passes.
- [x] 5.4 `node scripts/verification/gates.ts --scope=findings` fails with the linked findings.
- [x] 5.5 `node scripts/verification/mutation.ts` detects all 5 probes.
- [x] 5.6 `node scripts/openspec-check.ts` and `openspec validate --changes --strict` pass.
- RED: `node scripts/verification/gates.ts --scope=findings` fails on the linked UI/engine findings and 17 regression tests.
- GREEN: `node scripts/verification/gates.ts --scope=verified` passes on the verified subset; `npm test` passes 1284 tests.
- [ ] 5.7 PR opened; CI result reported; no merge.
