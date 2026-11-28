# Design

## Semantic proof, not names

`releaseMetadataOnly(root, baseRef)` reads `git diff --name-status` for
`baseRef...HEAD` and rejects:

- any path outside `VERSION`, `package.json`, `package-lock.json`,
  `CHANGELOG.md` and `RELEASE_STATE.md`;
- a deletion or rename of an allowed file;
- an empty diff.

It then compares the committed contents at `baseRef` and `HEAD`:

- `VERSION` is a semantic version, changed, and equals `package.json`'s
  `version`;
- `package.json` equals its base copy after removing `version`, so a dependency,
  script or any other field change fails;
- `package-lock.json`, when present, equals its base copy after removing the
  top-level `version` and the root package `version`; both versions equal
  `VERSION`;
- `CHANGELOG.md` carries `## [<version>] - <date>` and `## [Unreleased]`;
- `RELEASE_STATE.md` names the new version.

The title and the changed-file list decide nothing. The file list only limits
which paths the semantic comparison accepts.

## Risk and artifact gates

`checkRisk` receives `releaseMetadataOnly` from the CLI. When true, the computed
tier is R0 and no R1-R3 obligations apply; the author still supplies an `Issue:`
line, a `Risk:` line and evidence. `check-risk-artifacts` already skips every
risk below R3, so a proven metadata-only pull request declares `Risk: R0` and
needs no OpenSpec package.

A semantic failure prints its reasons and keeps the path-based tier, which is R3
for `package.json`. The pull request then needs its OpenSpec package as before.

## CI

The OpenSpec workflow already computes `BASE_SHA` for the changed-file list. It
passes the same value to `check-risk-tier.ts --base "$BASE_SHA"`, so the gate
validates the actual commit range, not a local working tree. No job is added,
removed or skipped.

## Rollback

Remove the `--base` argument and the validator; the path classification becomes
the sole rule again. No game, storage or release behavior depends on it.
