# Tasks

## 1. Worktree and RED evidence

- [x] 1.1 Create the worktree from current `origin/main`:
      `git worktree add ../grimoria-windows-verification -b fix/windows-verification origin/main`.
- [x] 1.2 RED structure test on Node 24.22.3:
      `npx node@24 --test src/ui/screens/structure.test.ts` — 3 passed, 1 failed;
      the boot test reported `src\\entry\\screens\\demo.ts` and
      `src\\entry\\test-entry.ts` against forward-slash exclusions.
- [x] 1.3 RED acceptance check on Node 24.22.3:
      `npx node@24 scripts/check-acceptance.mjs` — `ERR_UNSUPPORTED_ESM_URL_SCHEME`,
      received protocol `f:`.

## 2. Portable path fixes

- [x] 2.1 Add `portableRelative` to `structure.test.ts`, use it for the reported
      path, and add "repository-relative paths use forward slashes"; keep the
      boot-module forbidden-import assertion.
- [x] 2.2 GREEN: `npx node@24 --test src/ui/screens/structure.test.ts` — 4 passed.
- [x] 2.3 Load `support.ts` and `rules.ts` through `pathToFileURL` in
      `check-acceptance.mjs`.
- [x] 2.4 GREEN: `npx node@24 scripts/check-acceptance.mjs` — passed, 72 matrix
      roles, 12 test files.

## 3. Browser harness

- [x] 3.1 Build and serve both bundles from
      `mkdtemp(join(tmpdir(), "pg-browsercheck-"))`; keep `PG_SKIP_BUILD` for a
      caller-supplied artifact.
- [x] 3.2 Remove the temp artifact on process exit; verify no
      `pg-browsercheck-*` directory remains after a run.
- [x] 3.3 Add settle diagnostics (worker version, load count, waiting worker,
      controller state, cache keys) without changing the 450-attempt window.
- [x] 3.4 Full browser suite on Windows, Node 24.22.3, Playwright 1.65.0:
      `PLAYWRIGHT_MODULE=… npx node@24 scripts/browser-check.mjs` — passed three
      consecutive runs (about 57–70 s each), including the fast-update scenario.
- [x] 3.5 RED on CI: the Playwright job failed at `settle(page, nextCache)` with
      `waiting: true`, the old controller and both caches. `register()` exposed
      the waiting worker after `adopt()`, so the opening check raised a prompt
      instead of activating it.
- [x] 3.6 Mark the waiting worker automatic at the explicit opening-check call;
      add the `app/offline` delta scenario; run the focused browser check again.

## 4. Verification

- [x] 4.1 `npm run verify` on Node 24.22.3 (Node 24 shim) — exit 0.
- [x] 4.2 Every verify step repeated with the explicit Node 24 executable —
      typecheck, lint, format check, 596 tests, build, fallback, offline, policy,
      provenance and acceptance all passed.
- [x] 4.3 `npm run verify` on Node 26.13.0 — exit 0; no Node 26-specific failure
      observed. Node 24 remains the supported runtime.
- [ ] 4.4 Push the branch, open the PR against `main`, and report CI.

## Evidence

- RED: `npx node@24 --test src/ui/screens/structure.test.ts` reported
  `src\\entry\\screens\\demo.ts` and `src\\entry\\test-entry.ts` as boot offenders;
  `npx node@24 scripts/check-acceptance.mjs` failed with
  `ERR_UNSUPPORTED_ESM_URL_SCHEME`, received protocol `f:`.
- GREEN: the structure test passes 4/4 and the acceptance check reports
  72 matrix roles and 12 test files; `npm run verify` exits 0 on Node 24, and
  three full browser runs pass with the private artifact.
