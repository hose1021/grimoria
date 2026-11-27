# Tasks

## 1. RED: failing acceptance check

- [x] 1.1 Add `scripts/check-acceptance.mjs` with no dependency: verified matrix rows need an existing passing named test; no `test.mjs:<line>` citation may remain anywhere in the matrix; the support model, README table and secrets screen must agree with the matrix; every character needs a screen entry.
- [x] 1.2 Run the check on the unchanged tree and record the failure: line-number citations, missing named citations, no README support table and no shared screen entries.
- [x] 1.3 Add the regression in `js/support.test.mjs` that every supported role has one screen entry and an unknown role is explicitly `unsupported`.

## 2. GREEN: fix the drift

- [x] 2.1 Replace every `file.test.mjs:line` citation in `docs/rules-matrix.md` with a file and test name; fix rows whose old line pointed at an unrelated test.
- [x] 2.2 Mark the tested Goon `verified` with its test names and move it to the verified support list.
- [x] 2.3 Mark the untested Empath count `implemented-unverified` and move it to `requires-storyteller-choice`.
- [x] 2.4 Derive `roleSupportEntries(roles)` from `ROLE_SUPPORT`; delete the duplicate `BMR_ROLE_SUPPORT` table and the `bmrRoleSupport` helper.
- [x] 2.5 Render the shared script level and the non-verified role list on the secrets screen for Trouble Brewing, Bad Moon Rising and Sects & Violets.
- [x] 2.6 Add the generic screen detail strings to the ru/en/az catalogs.
- [x] 2.7 State the per-scenario support counts in the README and correct the test-coverage claim.
- [x] 2.8 Update the matrix audit pin, baseline, per-file table and stale defect notes.

## 3. Verification

- [x] 3.1 Run `node scripts/check-acceptance.mjs` and record the GREEN result.
- [x] 3.2 Run `npm run format`, `npm test` and `npm run verify`.
- [x] 3.3 Run `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 3.4 Report the evidence on the pull request; do not merge.

## Evidence

- RED: `node scripts/check-acceptance.mjs` in a detached worktree at the rebase
  base `48ad67f` with only this check copied in -> exit 1 with 158 failures:
  every verified row lacked a named citation or still cited a line number, the
  support model shipped no shared screen entries, and the README had no
  per-scenario support table. The check also reported `the support model has no
  roleSupportEntries`.
- GREEN: `node scripts/check-acceptance.mjs` -> `Acceptance check passed: 72 matrix roles, 11 test files.`
- GREEN: `npm test` -> 421 tests, 421 pass, 0 fail.
- GREEN: `npm run verify` -> typecheck, lint, format check, tests, build, fallback, offline, the type policy and the acceptance check passed.
- GREEN: `node scripts/openspec-check.mjs` -> passed; `openspec validate --changes --strict` and `--specs --strict` -> passed.
