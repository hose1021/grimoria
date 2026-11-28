# Proposal

Issue: #332

Epic: #200

## Why

The rules matrix, the independent official-rules audit and the UI semantic audit describe three different layers, but nothing makes them one executable contract. A passing unit suite or a green Playwright run can coexist with a missing UI action, a stale matrix citation or a selector that no test observes. The current audit found 20 UI findings and two existing engine findings; the gaps are in the evidence system, not only in individual screens.

The repository needs a permanent gate that:

- resolves every official rule to current engine tests and UI contracts/tests;
- fails on an architecture edge, a lost test identity, a legal action without a UI path, or a non-compliant contract;
- keeps known defects explicit instead of a temporary green baseline;
- separates fast semantic checks, the full integration suite, browser E2E and mutation probes.

## What Changes

- Add `docs/audits/verification-gates/` with the machine-readable traceability, test manifest, uncovered register, matrices and policy.
- Add `scripts/verification/build-trace.ts`, `test-index.ts`, `build-uncovered.ts`, `render-matrix.ts`, `gates.ts` and `mutation.ts`.
- Add `src/verification/architecture.test.ts`, `contracts.test.ts`, `action-reachability.test.ts`, selector and model-based tests, and a step-context gate test.
- Add `scripts/verification/findings.test.ts` with the red regression tests for the confirmed findings.
- Add `.github/workflows/verification.yml`: a green `semantic` job, an intentionally red `findings` job, and a scheduled mutation job.
- Leave the existing CI jobs, production behavior and public API unchanged. The only production-adjacent change is the narrower `StepDraftSource` type in `step-context.ts`, which is structural and accepts `TableDrafts`.

## Capabilities

### New Capabilities

- `workflow/verification-gates`: executable traceability, evidence and CI policy for official rules, engine tests and UI contracts.

### Modified Capabilities

None. The engine, application and screen behavior do not change.

## Impact

- `docs/audits/verification-gates/**` (new)
- `scripts/verification/**` (new)
- `src/verification/**` (new tests)
- `src/application/read-models/verification.test.ts` (new)
- `src/core/engine/model-based.test.ts` (new)
- `src/ui/screens/table/step-context.verification.test.ts` (new)
- `src/ui/screens/table/step-context.ts` (narrower input type only)
- `.github/workflows/verification.yml` (new)
- `openspec/changes/permanent-verification-gates/**` (new)

No storage key, schema, command, rule behavior, UI copy or dependency changes.

## Out of Scope

- Fixing the 20 UI findings and the two engine findings. They are linked to issues and recorded in `known-findings.md`; the `findings` job is red until they are fixed.
- Full mutation testing of every branch; the scheduled job covers five critical probes.
- A TSX/jsdom component test dependency; the existing Playwright suite is the component oracle.
- A new rule, a new role, a pin bump or a redesign.
