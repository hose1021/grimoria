# Proposal

Issue: #184

## Why

Verification is not reliable on Windows. `npm run verify` stops at
`src/ui/screens/structure.test.ts` because the scanner compares native
backslash paths with forward-slash exclusions, and
`node scripts/check-acceptance.ts` fails because a Windows absolute path is
passed to a dynamic import and interpreted as the `c:` or `f:` URL scheme.
The full browser check also failed once while waiting for the second service
worker; the harness serves a shared `dist/`, which any concurrent build can
rewrite.

## What Changes

- Normalize repository-relative paths at the structural scanner boundary
  without changing which imports are forbidden.
- Load the support and rules modules in the acceptance check through
  `pathToFileURL`, so Windows filesystem paths become valid `file://` URLs.
- Build and serve the browser check from a unique temporary directory per run,
  and remove it on exit. `PG_SKIP_BUILD` keeps its prebuilt-artifact meaning.
- Include the worker version, load count, waiting/controller state and cache
  keys in a settle failure. Do not increase the timeout to hide a failure.

## Impact

No game mechanic, dependency, persistence schema, source pin or licensing-path
change. The browser suite still drives the same built app and the same update
protocol. The supported runtime remains Node 24; Node 26 observations are
reported separately.
