# Design

## Context

See `proposal.md` for motivation. Current constraints that shape the approach:

- `scripts/browser-check.ts` is one 6,268-line script: it builds a private
  `/pocket/` artifact and a root-base artifact, serves the project-base copy,
  then runs one long shared-state sequence. Focused names are a map at the tail
  of the file; the build and server setup run before the map is consulted.
- The root-base artifact is consumed only by the fallback matrix inside
  `fullChecks()` (`createDistServer({ root: distRoot, prefix: "/" })`).
- `scripts/run-scenarios.ts` spawns one Node process per scenario in a serial
  `for` loop. Each process boots its own port-0 server, Chromium and context
  through `bootScenario()`, so CPU is the only shared resource. A failing
  scenario writes its screenshot into the shared `dist/` directory.
- `scripts/scenario-kit.ts` exposes `settle(page, ms = 90)`, a fixed
  `waitForTimeout`, and calls it after most clicks.
- Playwright is installed outside the repository and reached through
  `PLAYWRIGHT_MODULE`; `scripts/playwright.ts` is a hand-written structural
  boundary, not the package's types.
- CI runs `browser-check.ts` and `run-scenarios.ts` as sequential steps of one
  `browser` job on `ubuntu-24.04`, Node 24.
- Only Node built-ins and already-installed packages are allowed; the scripts
  are strict TypeScript run directly by Node.

## Goals / Non-Goals

**Goals:**

- Cut the pull-request browser pipeline wall clock by at least 30% against the
  recorded baseline (`44250134171`: 11 s install, 93 s checks, 1 s artifact,
  139 s scenarios, 4 min 10 s total).
- Keep every existing browser assertion and all 10 scenarios in the CI gate.
- Make one focused browser case cheap: one suitable artifact, one case, one
  named result.
- Preserve per-scenario and per-case failure attribution, nonzero exits and the
  filter interface.
- Stay portable to Windows for local runs.

**Non-Goals:**

- Migrating to `@playwright/test`, sharding, or replacing Playwright.
- Changing application code, routes, storage keys, the service-worker protocol
  or any game rule.
- Skipping, weakening or retrying away a failing assertion to reach a target.
- Rewriting the full-check sequence into independent processes unless the
  measured phase timings show that split is the remaining bottleneck.

## Decisions

### Bounded scenario pool instead of unbounded parallelism

Add a small `scripts/harness.ts` module with `mapLimit(items, limit, worker)`
and timing helpers. `run-scenarios.ts` uses `mapLimit` with a default of 3
workers, overridable through `PG_SCENARIO_WORKERS` (clamped to 1–8). Results
keep input order in the summary; PASS/FAIL lines print as each process settles.

- Why 3: a standard GitHub runner has 4 vCPUs and each scenario runs a Chromium
  process tree. Three concurrent browsers leave headroom for the Node parent and
  avoid the memory/CPU thrash of ten at once, while still converting 139 s of
  serial work into roughly a third.
- Why not `Promise.all`: ten Chromium instances on 4 vCPU oversubscribe and can
  make the run slower than serial.
- Why not `@playwright/test` workers: that requires converting the custom
  fixtures, the external `PLAYWRIGHT_MODULE` boundary and the hand-written types
  into a framework project — a rewrite that does not address the measured cost.

### Run-scoped capture directory for scenarios

The runner creates one `mkdtemp(join(tmpdir(), "pg-scenarios-"))` directory,
passes it to each child as `PG_SCENARIO_SHOTS`, and removes it on exit unless a
scenario failed (then it prints the path). `bootScenario().screenshot()` writes
into that directory when the variable is set, keeping the current path as the
standalone fallback. The built artifact stays read-only.

- Why: with concurrent processes, a late failure capture must not add files to
  the directory other scenarios serve, and `dist/` should not accumulate
  scenario images during a PR run.
- Alternative: per-scenario copies of `dist/` — wasteful and slow (hundreds of
  assets copied ten times).

### Build only the artifact the mode needs

Determine the focused case before any build. When `PG_BROWSER_CHECK` is set,
build and serve only the private project-base artifact; when `PG_SKIP_BUILD` is
set, build nothing. The root-base artifact remains part of the full run because
`fullChecks()` owns the root-base fallback matrix.

- Why: the focused cases operate on `page` and `url` only; the root server is
  created inside `fullChecks()`. Building an unused artifact adds a Vite build
  plus fallback and worker generation to every local focused run.
- Guard against stale artifacts: focused mode still builds by default, and the
  documented `PG_SKIP_BUILD` contract stays “use the existing build deliberately”.

### Coarse phase timing in the full check, not a rewrite

Add a `timed(name, fn)` helper that prints `PASS <name> (<ms> ms)` and wraps
existing named case functions and the coarse section boundaries in
`fullChecks()`. Do not reorder the shared-state sequence and do not split it
into processes in the first pass; the issue makes a split conditional on
measurement (`where this improves speed/diagnostics`).

- Why: the full check depends on ordered state (seeded games, `releaseOverride`
  for the update check, one browser context). Reordering or splitting it risks
  false regressions for no known gain.
- Alternative considered: one child process per named case with a shared static
  build. Each case would need its own browser/context and its own seeding; the
  diff is large and the benefit unproven until phase timings exist.

### Replace fixed sleeps only where readiness is observable

Replace `waitForTimeout` after a dispatch or click with a wait on the element or
state the next assertion reads (Playwright locator auto-waiting or
`waitForFunction`). Keep bounded explicit waits where the subject is
asynchronous: the service-worker update race, `pg-test-loads` sequencing and
cross-tab propagation.

- Why: most sleeps guard a React render or a route transition that already has a
  deterministic observable (route dataset, dialog selector, store state). Those
  are the cost centers when multiplied across hundreds of steps.
- What stays: transitions whose completion has no state marker beyond elapsed
  time. They become explicit `waitForFunction` timeouts with a named failure, not
  deleted assertions.

### Split the browser pipeline into two parallel CI jobs

Replace the single `browser` job with `browser` (regression checks) and
`scenarios` (build `/pocket/` + run the suite). Both install Node dependencies
and the pinned Playwright version; they start independently.

- Why: CI wall clock becomes approximately the slower job instead of the sum of
  both. The installation cost is duplicated but paid in parallel and is only
  about 11 s.
- Alternative: matrix sharding inside one job — more moving parts, and the two
  suites have different build needs.

### Preserve the public control surface

`PG_BROWSER_CHECK` names, the positional scenario filter, `PG_SKIP_BUILD`,
`PLAYWRIGHT_MODULE` and the exit codes stay as they are. `PG_SCENARIO_WORKERS`
is added. Documentation names the default and the override.

## Risks / Trade-offs

- **Concurrent Chromium memory pressure** → default 3 workers; `PG_SCENARIO_WORKERS` allows reducing to 1 for constrained machines; the CI runner has 16 GB.
- **CPU contention makes the last scenarios slower** → merged wall clock, not aggregate CPU, is the acceptance metric; the pool is bounded rather than unbounded.
- **Removing a sleep exposes a latent race** → replace each wait with an explicit observable and validate with three consecutive full runs; any check that needs timing keeps a named bounded wait.
- **Focused mode tests an unintended artifact** → the focused cases have no root-base consumer; the full run still builds and exercises both bases, and `PG_SKIP_BUILD` remains documented as an explicit reuse.
- **Two CI jobs consume more runner minutes** → installation runs twice, but job minutes are dominated by the two suites that previously ran one after another; coverage is unchanged.
- **Timing output adds noise** → one line per phase/case, plus a summary; failure lines keep the existing first-8-lines detail.

## Migration Plan

- Deploy: merge the workflow and script changes together; CI picks up the new jobs with the same pull-request trigger. Local commands keep their names (`node scripts/browser-check.ts`, `node scripts/run-scenarios.ts`, `npm run scenarios`).
- Rollback: revert the script and workflow files; no stored data, schema or artifact format changes to undo.
- Verification: record baseline and optimized timings side by side; validate three consecutive full runs on the default worker count.

## Open Questions

None that change the specs or task breakdown. The exact per-phase cutoff for
splitting `fullChecks()` is decided from the timing output during implementation
and does not change the contract.
