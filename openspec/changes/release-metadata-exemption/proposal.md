# Proposal

Issue: #519

## Why

Release preparation changes `VERSION`, the `package.json` version,
`CHANGELOG.md` and `RELEASE_STATE.md`. The diff classifier treats
`package.json` and `package-lock.json` as R3, and the R3 artifact gate then
demands an OpenSpec change for the release issue. No such change exists, so the
owner-controlled release workflow cannot prepare a version after #519.

A filename allowlist alone is not proof: an edit could add a dependency, a
script, a runtime import or a workflow step inside an allowed file. The
exemption must be proven from the commit range.

## What Changes

- Add `scripts/release-metadata.ts`, which reads the commit range and proves
  that only release metadata changed.
- `scripts/check-risk-tier.ts` accepts `--base <ref>` and classifies such a range
  as R0; the CI pull-request check passes the base SHA.
- Dependency, script, runtime, workflow and verification-policy changes stay
  R3 and keep their OpenSpec requirement.
- Add positive and negative tests for the validator, the tier decision and the
  artifact exemption.
- Add a multi-archive squash integration test so the #526 archive-gate failure
  cannot return unnoticed.

Required CI jobs are unchanged.
