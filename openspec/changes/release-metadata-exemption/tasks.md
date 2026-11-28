# Tasks

## 1. Semantic validator

- [x] 1.1 Add `scripts/release-metadata.ts` and prove it from a temporary Git repository.
- [x] 1.2 Reject dependencies, scripts, runtime files, workflows, verification policy, deletions and an empty diff.
- [x] 1.3 Require matching versions in `VERSION`, `package.json` and `package-lock.json`, a dated changelog heading and a release-state name.

## 2. Risk gates

- [x] 2.1 Classify a proven range as R0 in `check-risk-tier.ts` and keep R3 when the proof fails.
- [x] 2.2 Pass `BASE_SHA` from the OpenSpec workflow; keep every job and check.
- [x] 2.3 Keep the artifact gate free of an OpenSpec package for `Risk: R0`.

## 3. Post-squash coverage

- [x] 3.1 Add a multi-archive squash test that fails without reviewed origins and passes with them.

## 4. Verification

- [x] 4.1 `node --test` for the new and changed suites.
- [x] 4.2 `npm run verify`, strict OpenSpec and the risk checks on the pull request head.

## 5. Evidence

- RED: the release bump PR failed with `an R3 change needs an OpenSpec change line`.
- GREEN: `node --test scripts/release-metadata.test.ts scripts/check-risk-tier.test.ts
  scripts/check-risk-artifacts.test.ts scripts/archive-index.test.ts` passes 61/61,
  including the dependency, script, runtime, workflow and policy failures, the
  empty range, the version mismatch and the three-archive squash case.
