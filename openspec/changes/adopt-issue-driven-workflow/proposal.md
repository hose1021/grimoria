# Proposal

Issue: #19
Epic: https://github.com/hose1021/pocket-grimoire-go/issues/19

## Why

Issue #19 requires every mechanic to pass source → specification → RED test →
GREEN implementation → regression. The repository has no durable specification
layer: `SPEC.md` and `docs/rules-matrix.md` are prose, behavior claims are not
mechanically tied to tests, and there is no enforced link between an issue, a
change, a pull request and the verification result. Without that link, an agent
can claim support that a test does not prove, or write a requirement after the
code to match it.

## What Changes

- Add an OpenSpec baseline under `openspec/specs/` that records only behavior
  already asserted by tests, each requirement citing an official source and the
  asserting test.
- Add the `workflow/change-lifecycle` capability: the issue → change → PR → CI →
  merge → sync/archive pipeline and its evidence rules.
- Add `scripts/openspec-check.mjs` and a pull-request CI job that check artifact
  completeness, spec validity, source and test references, and PR references.
- Add a pull request template with issue, change, rules, RED, GREEN, regression,
  CI and limitation fields.
- Add the mandatory policy to `AGENTS.md`.
- No game logic changes. Issue #19 stays an epic and its unfinished boxes stay
  unchecked.

## Capabilities

### New Capabilities

- `workflow/change-lifecycle`: issue-backed changes, required artifacts,
  test-first evidence, verified sync, owner-controlled merge and PR
  traceability.

### Modified Capabilities

None. The baseline specs added by this change mirror existing verified
behavior; they do not extend it.

## Impact

- New files: `openspec/specs/**`, `openspec/changes/adopt-issue-driven-workflow/**`,
  `scripts/openspec-check.mjs`, `.github/workflows/openspec.yml`,
  `.github/pull_request_template.md`.
- Changed files: `AGENTS.md`, `docs/rules-matrix.md` (pointer only).
- Runtime and deployed assets are unchanged.
