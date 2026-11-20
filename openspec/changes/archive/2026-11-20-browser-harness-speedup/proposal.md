# Proposal

Issue: #294

## Why

The Playwright browser job takes about 4 min 10 s per pull request, and two
thirds of it is avoidable waiting: `scripts/browser-check.ts` runs one long
sequence with many fixed `waitForTimeout()` calls, and
`scripts/run-scenarios.ts` runs 10 independent scenario processes serially
(about 139 s). Slow feedback pushes UI work toward fewer browser runs and
weakens the regression gate in practice.

## What Changes

- Add per-phase and per-case timing output to `scripts/browser-check.ts` and
  `scripts/run-scenarios.ts`; record comparable baseline and optimized
  wall-clock timings in the change evidence.
- Replace the serial scenario loop in `scripts/run-scenarios.ts` with a bounded
  worker pool (default 3, `PG_SCENARIO_WORKERS` override), preserving scenario
  names, per-scenario timing, the filename filter, aggregated output and a
  nonzero exit on any failure.
- Isolate scenario side effects: per-scenario failure screenshots go to a
  run-scoped temp directory instead of the shared `dist/`; each process keeps
  its own port-0 server, browser and context. `dist/` stays read-only during a
  scenario run.
- Run browser regressions and full-game scenarios as two parallel CI jobs
  instead of two seconds-long steps in one job, without dropping any case.
- In focused `PG_BROWSER_CHECK` mode, build only the `/pocket/` project-base
  artifact; the root-base artifact is still built and exercised by the full
  check, which owns the fallback matrix.
- Replace avoidable fixed sleeps in `scripts/browser-check.ts` and
  `scripts/scenario-kit.ts` with DOM/app-state assertions or Playwright
  auto-waiting; keep deliberate timing where the check tests asynchronous
  behavior (service-worker update race, cross-tab propagation).
- Keep `@playwright/test` out of scope: the harness runs against an externally
  installed `PLAYWRIGHT_MODULE` and its custom fixtures, so a framework
  migration would be a rewrite, not a speedup. Split the monolithic check only
  where the measured profile justifies it.
- Update `README.md`, `scripts/AGENTS.md`, `AGENTS.md` and the CI workflow where
  commands, modes or timings change.

No game-rule, storage-key, route, export or player-visible behavior changes.

## Capabilities

### New Capabilities

- `workflow/browser-regression-harness`: how the browser regression checks and
  full-game scenarios are executed, isolated, selected, timed and reported in
  local runs and pull-request CI.

### Modified Capabilities

None.

## Impact

- `.github/workflows/ci.yml`: the `browser` job becomes two parallel jobs with
  the same coverage and one shared Playwright version.
- `scripts/browser-check.ts`, `scripts/run-scenarios.ts`,
  `scripts/scenario-kit.ts`, plus a small shared harness module and its test.
- `README.md`, `AGENTS.md`, `scripts/AGENTS.md` command and mode descriptions.
- No runtime bundle, storage schema or game state changes; `dist/` contents and
  the service-worker protocol stay the same.
