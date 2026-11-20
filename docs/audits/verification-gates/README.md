# Permanent semantic verification gates

Issue: #332. Parent epic: #200. Base commit: `5f079e1` (`origin/dev`).

This directory turns the official rules, the engine rule matrix and the UI
semantic contracts into a repeatable gate. It does not claim that the product is
correct: it proves that the committed data is current and consistent, and it
registers every rule and contract that lacks executable evidence. The state of
that evidence is read below, not assumed.

## What the gate proves

| Layer | Data / test | Command |
|---|---|---|
| Official rules | 523 atomic rules from the official-rules audit | `build-trace.ts` |
| Engine rules | 167 rows from `docs/rules-matrix.md`, `docs/rules-shared.md`, `src/core/roles/*/rule.md` | `build-trace.ts` |
| UI contracts | 87 contracts from the UI semantic audit | `build-trace.ts` |
| Test identity | 1473 node tests + 50 browser cases, with skip state | `test-index.ts` |
| Uncovered register | every rule and contract without executable evidence | `build-uncovered.ts` |
| Trace matrices | `traceability-matrix.md`, `ui-contract-test-matrix.md` | `render-matrix.ts` |
| Verified gate | trace current, cited verified test files executed, UI test refs, command scope, coverage pinning, architecture | `gates.ts --scope=verified` |
| Findings gate | non-compliant UI contracts, weak engine rules, missing UI actions, stale citations, regression suite | `gates.ts --scope=findings` |
| Mutation | 10 critical projections/gates, each with a green baseline | `mutation.ts` |

## Semantics

- `atomic-map.json` is the only way an official rule becomes verified. An entry
  maps one official rule ID to the engine rows whose documented requirement
  covers that sentence. No entry means `ROLE_LEVEL_ONLY`: the rule is registered
  as uncovered, because another rule for the same character passing proves
  nothing about this sentence.
- An engine rule is `verified` only when a current test whose name carries the
  rule ID exists **and executes**. A skipped or todo declaration is not evidence,
  and becoming skipped counts as removed coverage.
- A `ui` command needs a dispatch site outside comments. A contract marked
  `BROWSER_VERIFIED` needs `scripts/browser-check.ts`; `CONTRACT_TESTED` and
  `COMPONENT_TESTED` need a node test file.
- A verified official rule cannot be downgraded silently: losing its
  `atomic-map.json` entry fails unless `removed-verification.json` records it.
- `test-manifest.json` is a no-silent-deletion pin. With
  `VERIFICATION_BASE_REF` set, every identity that disappears or becomes skipped
  must be listed in `removed-tests.json` with a reason, and an entry for a test
  that still exists fails the gate.

## Status today (audited 2026-11-20)

- Official rules: 523; **241 verified, 10 partial (host-choice) and 272
  `ROLE_LEVEL_ONLY`**. `atomic-map.json` holds 251 reviewed entries;
  `uncovered.json` lists every remaining rule with that task. A role-level
  candidate is not evidence: only an atomic entry may claim a sentence.
- Engine rules: 167; 147 `verified`, 20 `host-choice`, 0
  `implemented-unverified`.
- UI contracts: 87; 87 `COMPLIANT`, 0 non-compliant, 0 not gate-covered.
- `gates.ts --scope=verified` and `gates.ts --scope=findings` pass;
  `gates.ts --scope=all` reports 0 findings.
- `mutation.ts` passes: 10 of 10 probes detected, each after a green baseline.
- `npm test` includes the verified tests and passes.

An empty findings register means no registered finding. It does not prove that
every sentence of every official rule is implemented or asserted: 272 official
rules remain role-level only, and a role-level match does not substitute for
sentence-level evidence.

## Commands

```sh
npm ci
node scripts/verification/test-index.ts
node scripts/verification/build-trace.ts
node scripts/verification/build-uncovered.ts
node scripts/verification/render-matrix.ts
node scripts/verification/gates.ts --scope=verified
VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=findings
node scripts/verification/mutation.ts
node --test scripts/verification/source-text.test.ts scripts/verification/gate-rules.test.ts
```

The generated files (`traceability.json`, `test-manifest.json`, `uncovered.json`
and the two matrices) are committed. The gate fails when any is stale, so a rule
ID, contract ID or test cannot disappear silently.

## Test layers

1. **Gate self-tests** (`source-text`, `gate-rules`): the scanners and the
   coverage pin, in the `semantic` job.
2. **Fast semantic** (`semantic` job): trace/manifest/uncovered/matrix checks,
   architecture, action classification, contract/selector/model tests.
3. **Extended integration**: existing `npm test`, `check-acceptance`, the full
   Playwright suite in `ci.yml`.
4. **Targeted browser**: the existing Playwright suite covers `/table`, `/bag`,
   `/seat`, `/player`, `/reference`, night/day, privacy, reload and languages.
   No TSX test transformer is added; the browser is the component oracle.
5. **Findings** (each PR, red): `gates.ts --scope=findings` plus
   `scripts/verification/findings.test.ts`.
6. **Mutation** (weekly/dispatch): 9 probes on critical selectors and gates.

## Limits

The gate cannot prove that a test asserts the rule it names; mutation probes and
review are that control. Sentence-level equivalence exists only for the reviewed
atomic entries (currently one). A listed contract test may not exercise its contract
(`audit.md` A-10). Role/topic candidates remain visible in the matrix for that
review.

## Files

- `audit.md` — independent audit of this system, defects and dispositions.
- `traceability.json` — machine-readable Official Rule → engine rule → UI contract.
- `traceability-matrix.md` — human-readable 523-rule matrix.
- `ui-contract-test-matrix.md` — 87-contract matrix.
- `test-manifest.json` — committed test identity baseline with skip state.
- `atomic-map.json` — reviewed official-rule → engine-rule mappings (one entry).
- `removed-verification.json` — allowed mapping downgrades with reasons.
- `removed-tests.json` — allowed test-identity removals with reasons.
- `uncovered.json` — every uncovered rule/contract with reason and task.
- `command-scope.json` — UI/product/internal/missing command classification.
- `known-findings.md` — red regression tests and linked issues.
- `architecture.md`, `coverage-policy.md`, `ci.md`, `mutation.md`.
