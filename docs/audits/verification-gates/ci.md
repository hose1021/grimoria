# CI integration

`.github/workflows/verification.yml` adds three jobs:

| Job | Runs | Status |
|---|---|---|
| `semantic` | trace/manifest/uncovered/matrix checks, architecture, action scope, contract/selector/model tests, `check-acceptance` | expected green |
| `findings` | `gates.ts --scope=findings`, 17 known red regressions and 23 uncovered UI contracts | **red until the linked issues are fixed** |
| `mutation` | 5 critical probes in a temporary copy | scheduled/workflow_dispatch |

The existing `ci.yml` continues to run typecheck, lint/format, unit tests, `check-acceptance`, the full Playwright suite, and the full-game scenarios. The new workflow does not duplicate the browser suite: the existing browser job is the component/E2E oracle.

## Policy

- A required `semantic` failure blocks a PR: a trace/rule/test identity violation, a stale manifest, an architecture edge, or a verified contract without a current test.
- The `findings` job is intentionally red. It must be made required only after the issues in `known-findings.md` are closed. Do not merge a PR that presents the findings gate as green; do not add a skip or an allowlist.
- `mutation` is not a per-PR cost; it runs on schedule and dispatch.
- `npm run verify` is not used as the only gate: it runs the full suite and lint, but it has no traceability, UI contract, action-scope, or mutation checks.
- The local RTK `npm run lint` wrapper failure is environmental; the CI uses the direct `npm run lint` on a standard runner, where oxlint passes. The audit environment's wrapper failure is documented separately.

## Adding a rule or contract

1. Add the official rule to `official-rules.json` (audit source).
2. Add/update the engine matrix row and its asserting test; ensure the test name carries the rule ID.
3. Add/update the UI contract in `ui-contracts.json`; name the test artifact.
4. Run `test-index.ts`, `build-trace.ts`, `build-uncovered.ts`, `render-matrix.ts`.
5. Run `gates.ts --scope=verified`; if the contract is not covered, add it to `uncovered.json` with an issue or add the test.
