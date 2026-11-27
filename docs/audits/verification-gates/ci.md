# CI integration

`.github/workflows/verification.yml` adds three jobs.

| Job | Runs | Status |
|---|---|---|
| `semantic` | base-ref fetch, `gates.ts --scope=verified` (which runs the cited test files), gate self-tests, contract/selector/model tests, `check-acceptance` | expected green |
| `findings` | `gates.ts --scope=findings`, the 17 known red regressions and the non-compliant UI contracts | **red until the linked issues are fixed** |
| `mutation` | 8 probes with a green baseline in a temporary copy | scheduled/workflow_dispatch |

The existing `ci.yml` continues to run typecheck, lint/format, unit tests,
`check-acceptance`, the full Playwright suite, and the full-game scenarios. The
new workflow does not duplicate the browser suite: the existing browser job is
the component/E2E oracle.

The `semantic` and `findings` jobs fetch the full history. On a pull request,
`VERIFICATION_BASE_REF` selects the base commit recorded in the event. Scheduled
and manual runs compare the checked-out commit with its first parent (`HEAD^`).
Both jobs check that `removed-tests.json` justifies any removed or newly skipped
test.

## Policy

- A `semantic` failure blocks a PR: a trace/rule/test identity violation, a
  stale manifest, a stale citation on a verified row, a skipped or failing cited
  test, an architecture edge, an unclassified command, a comment-only dispatch
  site, or a verified contract without a current test.
- The `findings` job is intentionally red and must not be made required while
  the issues in `known-findings.md` are open. A green findings job with those
  defects still present would be a false statement, not progress.
- `mutation` is not a per-PR cost; it runs on schedule and dispatch.
- `npm run verify` is not the only gate: it runs the full suite and lint, but it
  has no traceability, UI contract, action-scope, base-ref or mutation checks.

## Required checks: owner action

`gh api repos/hose1021/grimoria/branches/dev/protection` returns 404 and
`gh api repos/hose1021/grimoria/rulesets` returns `[]`. Neither `main` nor `dev`
has protection or a required status check, so a red PR can be merged. The
account has admin permission, so this is a product decision, not a capability
gap.

Required contexts once the findings job is green:

```
Branch and pull request title
Specifications
Type check
Lint and format
Unit tests
Semantic contracts and traceability
Playwright regression checks
Full-game scenarios
Known findings
```

Do not add `Known findings` before its defects are closed: it would block every
PR for the known reasons. Do not add `continue-on-error` to any verification
job, and do not narrow its `paths` filter.

## Adding a rule or contract

1. Add the official rule to `official-rules.json` (audit source).
2. Add/update the engine matrix row and its asserting test; ensure the test name
   carries the rule ID and the test executes.
3. Add an `atomic-map.json` entry only after reading the official statement and
   the row's documented requirement.
4. Add/update the UI contract in `ui-contracts.json`; name the test artifact and,
   for a browser check, a case or phase that the suite runs.
5. Run `test-index.ts`, `build-trace.ts`, `build-uncovered.ts`, `render-matrix.ts`.
6. Run `gates.ts --scope=verified`; an uncovered contract must be listed in
   `uncovered.json` with an issue or a task.
