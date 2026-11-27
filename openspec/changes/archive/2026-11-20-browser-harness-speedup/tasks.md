# Tasks

## 1. Baseline and shared harness

- [x] 1.1 Record the baseline before changing anything: for the unmodified checkout, run `node scripts/browser-check.ts` with `PLAYWRIGHT_MODULE` set and record its wall clock plus any existing output; run `node scripts/run-scenarios.ts` on the `/pocket/` build and record the total and each `PASS ... (ms)` line; note the CI baseline from issue #294 (`44250134171`). Keep the numbers for the evidence section.
- [x] 1.2 Add `scripts/harness.ts` with `mapLimit(items, limit, worker)`, `workerCount(value, cpus)` parsing, and `timed(name, fn)` printing `PASS <name> (<ms> ms)` or `FAIL <name> (<ms> ms)` before rethrowing. Add `scripts/harness.test.ts` first: verify it fails while the module is absent, then passes with `node --test scripts/harness.test.ts`; cover the concurrency ceiling, input-order results, error propagation, and worker parsing (`PG_SCENARIO_WORKERS`, invalid and out-of-range values).
- [x] 1.3 Add per-case timing to `scripts/browser-check.ts` by wrapping the focused case map and the existing named check functions with `timed`; verify `PG_BROWSER_CHECK=heir-question` prints one named line with its duration and exits zero.

## 2. Parallel scenario runner

- [x] 2.1 Replace the serial loop in `scripts/run-scenarios.ts` with `mapLimit`, default 3 workers, `PG_SCENARIO_WORKERS` override, per-scenario PASS/FAIL and milliseconds, the existing filename filter, first-8-lines failure detail, a final summary and a nonzero exit when any scenario fails; verify `PG_SCENARIO_WORKERS=1 node scripts/run-scenarios.ts tb` passes and `PG_SCENARIO_WORKERS=3 node scripts/run-scenarios.ts tb 8` passes the two matching files.
- [x] 2.2 Move failure captures out of `dist/`: the runner creates a run-scoped `mkdtemp` directory, exports it as `PG_SCENARIO_SHOTS`, and removes it after a clean run; `scenario-kit.ts` writes screenshots to that directory when set. Verify with `node --test scripts/harness.test.ts` for the path resolution and by running one scenario filtered: no new `scenario-*.png` appears under `dist/`.
- [x] 2.3 Document the worker default and override in `scripts/AGENTS.md`, and verify the documented commands run as written.

## 3. Focused browser mode

- [x] 3.1 Decide the focused case before any build in `scripts/browser-check.ts`; build only the private project-base artifact when `PG_BROWSER_CHECK` is set, keep both artifacts in full mode, and keep `PG_SKIP_BUILD` build-free. Verify `PG_BROWSER_CHECK=mayor-redirect node scripts/browser-check.ts` succeeds and prints that no root-base build ran (observed log or temp-directory listing), while the full run still exercises the root-base fallback matrix.
- [x] 3.2 Keep the focused case map authoritative and fail with a nonzero exit naming an unknown `PG_BROWSER_CHECK`; verify with `PG_BROWSER_CHECK=no-such-case node scripts/browser-check.ts` and record the message.
- [x] 3.3 Record the focused-check wall clock before and after 3.1 on the same machine and build mode; verify the focused run is shorter and the full mode output still reports every case.

## 4. Replace avoidable fixed sleeps

- [x] 4.1 Replace `settle()` calls in `scripts/scenario-kit.ts` with waits on the step, dock or state the next assertion reads, keeping an explicit bounded wait only where a transition has no state marker; verify each affected scenario passes three consecutive times.
- [x] 4.2 Replace fixed `waitForTimeout` calls in `scripts/browser-check.ts` after route changes, dispatches, dialog actions and viewport changes with `waitForFunction` on the route/step/DOM state the next assertion reads; retain and name the deliberate timing checks for the service-worker update race, `pg-test-loads` sequencing and cross-tab propagation. Verify the full browser check passes and the remaining occurrences are only the deliberate timing cases.
- [x] 4.3 Record the wait policy in `scripts/AGENTS.md`: observe application state or use auto-waiting; a fixed wait must name the asynchronous behavior it measures.

## 5. Parallel CI and user-facing documentation

- [x] 5.1 Split the `browser` job in `.github/workflows/ci.yml` into `browser` (regression checks) and `scenarios` (build `/pocket/` + run the suite), both installing the same pinned Playwright version and Node 24; verify the two job blocks in the diff have no shared step and the pull-request run reports both jobs on the change branch.
- [x] 5.2 Update `README.md` (browser check and scenario commands, `PG_SCENARIO_WORKERS`, focused mode), `AGENTS.md` "Testing" and `scripts/AGENTS.md`; verify every documented command runs as written and `npm run typecheck` accepts the edited scripts.

## 6. Integration verification

- [x] 6.1 Run `npm run verify`; verify typecheck, lint, format check, unit tests, build, fallback, offline, policy, acceptance and version checks pass.
- [x] 6.2 Run the complete browser pipeline three consecutive times with the default worker count; verify each run is green, record per-phase and per-scenario timings, and compute the wall-clock change against 1.1 and the CI baseline.
- [x] 6.3 Run the focused path and the scenario filter once from the Windows checkout used for development; verify both exit as documented and record any remaining flakiness.
- [x] 6.4 Run `node scripts/openspec-check.ts`, `openspec validate --changes --strict` and `openspec validate --specs --strict`; verify all pass.
- [x] 6.5 Open the pull request against `dev`, report the CI result including both browser jobs, and stop for the owner.

## Workflow follow-up

- Archive this change only after the owner merges and every check above passes on the merge result.
- Remove the worktree and delete the local branch after the merge.

## Evidence

- RED: `node --test scripts/harness.test.ts` before `scripts/harness.ts` existed failed with `ERR_MODULE_NOT_FOUND` for `./harness.ts`. The unmodified focused run (`PG_BROWSER_CHECK=heir-question`) built both artifacts and printed no timing line.
- GREEN: `node --test scripts/harness.test.ts` passes 5/5. `PG_BROWSER_CHECK=mayor-redirect node scripts/browser-check.ts` prints `Focused check: mayor-redirect; project-base artifact only.` and `PASS mayor-redirect (1244 ms)`; `PG_BROWSER_CHECK=no-such-case` exits 1 with `Unknown browser check: no-such-case`; `PG_SKIP_BUILD=1 PG_BROWSER_CHECK=mayor-redirect` passes in 1.2 s. `PG_SCENARIO_WORKERS=1 node scripts/run-scenarios.ts tb` passes 2/2; `PG_SCENARIO_WORKERS=3 node scripts/run-scenarios.ts tb 8` passes 2/2. A temporary failing scenario produced `FAIL zz-fail-probe.ts`, `Failed: zz-fail-probe.ts`, a kept `Failure captures:` directory and exit 1.
- Timings on the Windows dev checkout, same machine: browser check 84 s → 62/62/61 s across three consecutive full cycles; full-game scenarios 133 s serial → 30/31/30 s at the default 3 workers; focused `mayor-redirect` 4 s (both artifacts) → 2.8 s (project base only). CI baseline from issue #294 is 93 s checks + 139 s scenarios in one job; after the split the two jobs run in parallel.
- `npm run verify` exits 0 (typecheck, format check, 0 failing unit tests, build, fallback, offline, policy, acceptance, version). `npx oxlint src scripts vite.config.ts` exits 0; a later `npm run lint` returned the environment's transient `ESLint output (JSON parse failed...)` wrapper error while the direct oxlint run stayed green.
