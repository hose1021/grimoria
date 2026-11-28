# Tasks

- [x] Verify corrupt legacy recovery and write retries.
- [x] Protect active windows during installation, activation and reload.
- [x] Verify lazy routes, localized startup and offline asset reachability.
- [x] Fix the countdown, edition links and reference retries.
- [x] Verify the nested-worktree regression, run checks and bump the patch release.

- RED: The legacy store tests failed twice, the active opening-update test sent one unconfirmed activation, and a rejected note allowed activation. The offline worker initially cached unused assets and returned a network response for an old window’s deferred chunk. The failed-reference retry remained HTTP 503. Edition route and countdown coverage also failed on the starting implementation.
- GREEN: Targeted store, active-update, offline-worker, reference, countdown and edition tests pass. The Bad Moon Rising home link opens its own 25-role sheet at 390 px. The policy regression for nested worktrees passes on the starting revision from PR #31.

## Verification

- `node --test src/application/store/create-game-store.test.ts src/entry/offline.test.ts src/infrastructure/offline/offline-worker.test.ts src/ui/screens/reference/reference-data.test.ts src/ui/screens/table/helpers.test.ts src/ui/sheet-route.test.ts` covers the fixes directly.
- `npm run verify` passed with 1,621 app tests and 24 tooling tests. `VERIFICATION_BASE_REF=origin/main npm run verification:all` recorded zero open findings.
- `node scripts/openspec-check.ts`, `openspec validate --specs --strict` and `openspec validate --changes --strict` passed.
- The production build precaches 238 URLs and 6.25 MB, down from 402 URLs and 10.78 MB. The initial home JavaScript, including module preloads, fell from 320.5 KB to approximately 231 KB gzipped.
- The built-in browser opened the correct edition at 390 px with zero console warnings or errors. A production preview returned HTTP 503 for one reference chunk; the screen offered Retry and loaded successfully when the request recovered.
