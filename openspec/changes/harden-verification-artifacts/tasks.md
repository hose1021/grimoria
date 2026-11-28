# Tasks

## 1. Registry

- [x] 1.1 Restore the 43 matrix citations across 35 rules into `rules/*.json`;
      verify `npm run rules:check` reports 172 rules and the citation parity
      test passes exact id + file + name comparisons.
- [x] 1.2 Delete the 72 `rule.md` dossiers and the legacy exporter; verify
      `role-ownership --check`, acceptance and the trace build read JSON only.
- [x] 1.3 Check the matrix against the registry for all 172 identifiers and the
      42 `SYS-` rows; `--write` renders the requirement column.

## 2. Archive

- [x] 2.1 Rebuild the index with the earliest introducing commit per change
      (40 distinct), append-only merge and complete tree SHA-256.
- [x] 2.2 Require the current baseline: reject missing, malformed, duplicated or
      incomplete records; pin the original anchor fixture.
- [x] 2.3 Fail when a tree accepted on the target branch disappears or changes.
- [x] 2.4 Resolve an archive origin from the index committed with its first add
      when the target holds no record, so repeated feature, squash, release and
      back-merge cycles keep it; `scripts/archive-index.test.ts` runs both
      releases in a real repository.
- [x] 2.5 Validate every indexed test reference and resolve a dangling one
      through a reviewed correction in
      `fixtures/conformance/archive-test-corrections.json`; the index list must
      equal the archived delta specs.
- [x] 2.6 Require an archive outside the accepted anchor to be complete, with no
      open checklist item and a RED/GREEN record; the anchor stays untouched.

## 3. Risk and artifacts

- [x] 3.1 Classify official sources, verification baselines, package files,
      storage, validators, conformance fixtures and workflow policy as R3.
- [x] 3.2 Require an R3 change to name a same-issue OpenSpec change with
      proposal, design, tasks and a delta spec; allow a policy migration to set
      `Policy migration: true`.
- [x] 3.3 Compare requirement bodies during reconciliation, not headings.
- [x] 3.4 Apply citation corrections by rule id, file and test name, so several
      corrections for one rule all take effect; `scripts/rule-registry.test.ts`.
- [x] 3.5 Run the pull request checks again when the body, title or base branch
      changes, and exempt only the repository's own `dev` or `main` branch.
- [x] 3.6 Fail when a rule level accepted on the target branch drops or the rule
      disappears; a raise passes. The 172 levels are equal at `ffbce394`.

## 4. Verification

- [x] 4.1 `npm run verify` passes: typecheck, lint, format, node tests, build,
      fallback, offline, policy, validators, matrix, archive, acceptance.
- [x] 4.2 `node scripts/openspec-check.ts`, strict spec and change validation
      pass; CI is green on the current head.
- [x] 4.3 Mutation probes detect 10 of 10 critical mutations.

## 5. Evidence

- RED: the migrated trace kept 35 rules with a partial citation set; comparing
  the registry with `ffbce394` lost 43 citations.
- GREEN: the parity test requires every baseline citation by exact name and
  fails when a citation is replaced by another test in the same file.
- RED: the archive index lost provenance through a squash merge and accepted a
  coordinated deletion of the archive, index and baseline.
- GREEN: the original anchor and the target-branch baseline both fail on a
  removed or rewritten archived tree.
- RED: an R3 body accepted an unrelated OpenSpec change.
- GREEN: the artifact check rejects an issue mismatch and accepts a same-issue
  policy migration.
- RED: a release pull request failed after a feature archive was squashed into
  dev (`2026-02-01-two: origin differs from its accepted record or first add`),
  and two corrections for one rule dropped all but the last.
- GREEN: the lifecycle test passes release 1, release 2 and both back-merges,
  and the two-correction parity test passes with both targets present.
