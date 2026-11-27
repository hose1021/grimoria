# Design

## Context

- `docs/rules-matrix.md` has 72 role rows + shared `SYS-` rows with rule IDs, levels, pinned revisions and test citations.
- `docs/rules-shared.md` declares the `SYS-` rows.
- `src/core/roles/<role>/rule.md` carries the per-role rule identifiers and tests.
- `docs/rules-matrix.md` row gating is checked by `scripts/check-acceptance.ts`; it requires at least one passing test per verified row, but not that **every** citation is current.
- The independent official-rules audit has 523 atomic rules in `docs/audits/verification-gates/official-rules.json`.
- The UI semantic audit has 87 contracts in `docs/audits/verification-gates/ui-contracts.json`.
- The test runner is `node:test`; the browser suite is Playwright; there is no TSX/jsdom test dependency.

## Decisions

### One committed trace, generated and checked

`build-trace.ts` generates `traceability.json` from the official rules, the UI contracts, the matrix, the shared document and the role docs. The file is committed. `--check` fails when it is stale. The mapping is role/topic-level because an official sentence does not map one-to-one to an engine branch; the `note` and `uncovered.json` record the gap.

### Current tests, not stale citations

The test index is committed as `test-manifest.json`. The trace only lists `engineTests` that exist in the current manifest. Stale matrix citations are reported as findings; they do not count as evidence. This surfaces the 51 old citations without failing the verified subset for a documentation drift.

### Known findings are red, not allowlisted

`findings.test.ts` asserts the expected correct behavior for F-001..F-018. The `findings` job runs it and fails. The `uncovered.json` register lists every non-compliant/static UI contract, weak engine rule and no-UI official rule with a reason and issue. No skip, expected-value change or exclusion is used.

### Test identity cannot disappear silently

`test-index.ts` walks `src/**/*.test.ts` and `scripts/**/*.test.ts` and writes every test name. The gate fails when a manifest entry is missing from the tree or a new test is not in the manifest. A deliberate removal requires a manifest diff.

### Fast vs expensive

The `semantic` job runs only Node tests and the policy scan (seconds). The existing `ci.yml` keeps the full unit/browser/scenario suite. Mutation runs on schedule/dispatch. This avoids moving the combinatorial volume into the browser.

### No new dependency

Node's standard library and the existing React/Playwright stack cover the requirements. The component layer is browser-tested; the pure selectors and view models are Node-tested. The only production-adjacent change is a structural narrowing of `stepContext`'s input type, which makes the gate testable without a React renderer.

## Risks

- The official→engine mapping is coarse. A rule can be `ENGINE_VERIFIED` while the engine implements only a related row. The `notes` and `uncovered.json` expose this; a future sentence-level mapping is a separate change.
- The stale matrix citations are a documentation debt; the verified gate reports them but does not fail. The 51 citations should be cleaned in the matrix.
- The findings job is red by design. It must not be made required until the linked issues are fixed; the owner decides.
- The mutation set is small. It is a regression guard for the audit's critical projections, not a full mutation score.
