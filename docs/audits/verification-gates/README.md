# Permanent semantic verification gates

Issue: #332. Parent epic: #200. Base commit: `c4ccbdc79bedd7834bbc5484e542e50f5b8fdf43` (`origin/dev`).

This directory turns the official rules, the engine rule matrix and the UI semantic contracts into a repeatable gate. It is not a claim that the product is fully correct: the **verified** scope passes today, the **findings** scope is deliberately red until the linked issues are fixed.

## What is checked

| Layer | Data / test | Command |
|---|---|---|
| Official rules | 523 atomic rules from the independent official-rules audit | `build-trace.ts` |
| Engine rules | 166 rows from `docs/rules-matrix.md`, `docs/rules-shared.md`, `src/core/roles/*/rule.md` | `build-trace.ts` |
| UI contracts | 87 contracts from the UI semantic audit | `build-trace.ts` |
| Test identity | 1353 node tests + 15 browser cases | `test-index.ts` |
| Uncovered register | 176 official rules without a UI surface, 21 weak engine rules, 23 UI contracts not gate-covered | `build-uncovered.ts` |
| Trace matrices | `traceability-matrix.md`, `ui-contract-test-matrix.md` | `render-matrix.ts` |
| Verified gate | trace current, engine tests current, UI test refs, architecture, command scope | `gates.ts --scope=verified` |
| Findings gate | non-compliant UI contracts, weak engine rules, missing UI actions, regression suite | `gates.ts --scope=findings` |
| Mutation | 5 critical projections/gates in a temporary copy | `mutation.ts` |

## Commands

```sh
npm ci
node scripts/verification/test-index.ts
node scripts/verification/build-trace.ts
node scripts/verification/build-uncovered.ts
node scripts/verification/render-matrix.ts
node scripts/verification/gates.ts --scope=verified
node scripts/verification/gates.ts --scope=findings
node scripts/verification/mutation.ts
```

The generated files `traceability.json`, `test-manifest.json`, `uncovered.json` and the two matrices are committed. The gate fails when any is stale, so a Rule ID, UI Contract ID or test cannot disappear silently.

## Status today

- Official rules: 523; 437 `ENGINE_VERIFIED`, 86 `ENGINE_PARTIAL` (host-choice or one weak row).
- Engine rules: 166; 145 `verified`, 21 `host-choice`/`implemented-unverified`.
- UI contracts: 87; 65 `COMPLIANT`, 22 non-compliant/unreachable/out-of-scope; 23 not gate-covered.
- `gates.ts --scope=verified` passes.
- `gates.ts --scope=findings` fails: 23 UI contracts, 2 engine `implemented-unverified` rules, the missing `recordKlutzChoice` UI action, and 17 failing regression tests. See [known-findings.md](known-findings.md).
- `mutation.ts` passes: all 5 critical mutations are detected.
- Existing `npm test` includes the new verified tests and passes.

## Trace model

Each official rule row has:

- `engineRuleIds` — the engine matrix rows for the same role/topic.
- `engineTests` — only tests that exist in the current manifest.
- `uiContractIds` — UI contracts whose rule IDs intersect the engine rows.
- `uiTests` — test artifacts named by those contracts.
- `status` — `ENGINE_VERIFIED`, `ENGINE_PARTIAL`, `ENGINE_UNVERIFIED` or `UNMAPPED`.
- `uiCoverage` — `UI_COVERED` or `NO_UI_CONTRACT`.
- `note` — why a rule is partial or has no UI.

The mapping is **role/topic level**, not sentence-level equivalence. An official rule may be broader than the engine rows it maps to. The `uncovered.json` register records every gap and the required task. This is a reviewed mapping, not an assertion that one official sentence equals one engine branch.

## Test layers

1. **Fast semantic** (each PR, `semantic` job): trace/manifest/uncovered/matrix checks, architecture, action classification, contract/selector/model tests. No browser.
2. **Extended integration** (each PR): existing `npm test`, `check-acceptance`, full browser suite in `ci.yml`.
3. **Targeted browser** (each PR): the existing Playwright suite covers the critical flows (`/table`, `/bag`, `/player`, `/public`, night/day, privacy, reload, languages). A new React DOM test harness is intentionally not added: the stack has no TSX test transformer and the task forbids a new dependency without justification; browser tests are the component oracle.
4. **Mutation** (weekly/workflow_dispatch): `scripts/verification/mutation.ts`, 5 probes on critical selectors/gates.
5. **Findings** (each PR, red): `gates.ts --scope=findings` + `scripts/verification/findings.test.ts`.

## CI policy

The `findings` job is intentionally not green. It must become required only after the linked issues are fixed. A PR that changes a rule, a UI contract or a test must update the generated data and pass the **verified** gate; the **findings** gate remains red until the known defects are closed. Do not merge this PR while the findings gate is red.

## No new dependency

Only `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:url`, `node:child_process`, `react`/`react-dom/server` (already installed) and the existing Playwright installation are used.

## Files

- `traceability.json` — machine-readable Official Rule → Engine Test → UI Contract → UI Test.
- `traceability-matrix.md` — human-readable 523-rule matrix.
- `ui-contract-test-matrix.md` — 87-contract matrix.
- `test-manifest.json` — committed test identity baseline.
- `uncovered.json` — every uncovered rule/contract with reason and issue.
- `command-scope.json` — UI/product/internal/missing command classification.
- `known-findings.md` — red regression tests and linked issues.
- `architecture.md` — boundary checks and limitations.
- `coverage-policy.md` — evidence levels and no-silent-deletion rule.
- `ci.md` — workflow and job policy.
- `mutation.md` — probe results.
