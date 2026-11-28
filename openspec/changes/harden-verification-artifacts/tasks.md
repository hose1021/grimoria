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
- [x] 2.7 Compare the working anchor with the target's anchor, so a new record
      cannot exempt itself; refuse a build that would re-pin a dropped or
      changed record, and refuse to rebuild a malformed index. The CLI test
      runs the real script against a temporary repository.
- [x] 2.8 Derive the anchor from the target branch's archive tree: 134 target
      records, so the 39 newly archived changes are checked by the readiness
      gate.
- [x] 2.9 Apply every archived delta to the baseline (ADDED/MODIFIED present,
      REMOVED absent), reject an empty RED or GREEN line, a symbolic link and a
      non-regular test reference.
- [x] 2.10 Require a reviewed origin record for a squash-rewritten origin; a
      same-commit self-attested origin fails.
- [x] 2.11 Recover the 32 archives whose specs name only historical `.mjs` files
      through `fixtures/conformance/legacy-test-paths.json`, with a task/design
      fallback; no archive has an empty test list.
- [x] 2.12 Require the normative requirement text, without its citations, to
      match the baseline at the transition, not just its name; a body the
      baseline refined after the sync carries a reviewed record in
      `fixtures/conformance/archive-content-corrections.json`, and a stale or
      unknown record fails.

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
- [x] 3.7 Resolve the evidence a body cites (test file, registry rule, asserting
      test file), resolve an archived change by its exact name, fail closed on an
      unknown accepted level, widen the citation path parser, refuse an
      unrepresentable matrix citation, and read NUL-separated changed-file
      lists; tests for each.
- [x] 3.8 Apply every tier's evidence in a mixed diff; an R3 label does not
      waive the gameplay obligations.
- [x] 3.9 Name the generated trace source `registry` instead of the retired
      `role-doc` dossiers.

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
- RED: an archive with no `tasks.md` passed once its name was appended to the
  anchor, and a deleted baseline record let the build re-pin a changed tree.
- GREEN: the real-CLI test fails the anchor growth, the re-pin and a malformed
  index, and reports the missing `tasks.md`.
- RED: a body citing `TB-FAKE-99` and a missing test file passed R2, and an
  empty `## Verification` passed R0.
- GREEN: the risk check names the unknown rule and the missing file and rejects
  the empty section; an unrepresentable matrix citation is reported instead of
  written.
- RED: the anchor carried all 173 archives, so no newly archived change was
  checked; a same-commit origin, an unapplied delta, an R2 path in an R3 diff and
  an empty test list all passed; 32 archives named only historical `.mjs` files.
- GREEN: the anchor holds the 134 target records; the 39 new archives pass the
  applied-delta and non-empty evidence checks; an unrecorded squash origin fails
  until its reviewed record exists; the mixed diff requires the R2 evidence; all
  173 archives name a current test.
- RED: a MODIFIED requirement whose name existed in the baseline passed with an
  unsynced body, because presence alone was checked; a record whose body already
  matched or named no requirement also passed.
- GREEN: the transition check compares the normative body without its citations
  and refuses a mismatch unless a reviewed record names the archive and the
  requirement; the 10 historical drifts carry records, and a stale, duplicate,
  empty or unknown record fails.
