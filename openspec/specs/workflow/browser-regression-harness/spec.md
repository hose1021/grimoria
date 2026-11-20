# workflow/browser-regression-harness Specification

## Purpose
Defines how the project runs its real-Chromium regression checks and full-game
scenario suite locally and in pull-request CI: how a run is selected, isolated,
executed concurrently, timed and reported without losing coverage.

## Requirements

### Requirement: Focused browser runs select one case

A focused browser run SHALL execute only the requested regression case and
SHALL build only the artifact that case needs. An unknown case name SHALL fail
with a nonzero exit that names it.

**Source**: [Issue #294](https://github.com/hose1021/grimoria/issues/294); `AGENTS.md` "Testing"
**Tests**: `scripts/browser-check.ts`, `scripts/harness.test.ts`

#### Scenario: One focused case

- **WHEN** `PG_BROWSER_CHECK` names a supported case
- **THEN** the run builds and serves the project-base artifact, executes that case only, and exits zero on success

#### Scenario: Unnecessary root-base build

- **WHEN** a focused case runs without `PG_SKIP_BUILD`
- **THEN** the root-base artifact is not built, because only the full check exercises the root-base fallback matrix

#### Scenario: Unknown focused case

- **WHEN** `PG_BROWSER_CHECK` names no supported case
- **THEN** the run exits nonzero and the message names the unknown case

#### Scenario: Artifact reuse

- **WHEN** `PG_SKIP_BUILD` is set
- **THEN** the run uses the existing artifact without building and does not silently test a different one

### Requirement: Full browser runs cover every case and report timing

A full browser run SHALL execute every browser regression case, including the
project-base and root-base fallback matrix, and SHALL report each case's name
and elapsed time.

**Source**: [Issue #294](https://github.com/hose1021/grimoria/issues/294); `AGENTS.md` "Testing"
**Tests**: `scripts/browser-check.ts`, `scripts/harness.test.ts`

#### Scenario: Case timing

- **WHEN** a browser case completes
- **THEN** the output names the case and its elapsed milliseconds

#### Scenario: Case failure

- **WHEN** a browser case fails
- **THEN** the output names that case and the process exits nonzero

#### Scenario: Coverage parity

- **WHEN** the full check runs
- **THEN** every previously existing assertion and both base paths still execute

### Requirement: Scenarios run with bounded concurrency

The full-game scenario runner SHALL execute independent scenario processes
concurrently under a bounded worker count, SHALL keep the filename filter, and
SHALL exit nonzero when any scenario fails.

**Source**: [Issue #294](https://github.com/hose1021/grimoria/issues/294)
**Tests**: `scripts/run-scenarios.ts`, `scripts/harness.test.ts`

#### Scenario: Bounded pool

- **WHEN** more scenarios are selected than the configured worker count
- **THEN** at most that many scenario processes run at once and every selected scenario still runs

#### Scenario: Per-scenario result

- **WHEN** a scenario finishes
- **THEN** the output names the scenario, its PASS or FAIL result and its elapsed milliseconds

#### Scenario: One failed scenario

- **WHEN** one scenario fails while others pass
- **THEN** the run reports the failed scenario and exits nonzero

#### Scenario: Focused scenario

- **WHEN** the runner receives filename arguments
- **THEN** it runs only the matching scenarios

#### Scenario: Worker configuration

- **WHEN** `PG_SCENARIO_WORKERS` sets a positive worker count
- **THEN** the runner uses it instead of the default

### Requirement: Concurrent scenarios do not share mutable state

Each scenario SHALL own its server, browser context and storage. The shared
build artifact SHALL be read-only during a run, and a failure capture SHALL NOT
write into the directory that other scenarios serve.

**Source**: [Issue #294](https://github.com/hose1021/grimoria/issues/294)
**Tests**: `scripts/scenario-kit.ts`, `scripts/run-scenarios.ts`

#### Scenario: Parallel servers

- **WHEN** two scenarios run at the same time
- **THEN** each listens on its own ephemeral port and uses its own browser context

#### Scenario: Shared artifact

- **WHEN** a scenario serves the built application
- **THEN** it only reads the build output and writes no shared asset

#### Scenario: Failure capture

- **WHEN** a scenario fails
- **THEN** its screenshot and state dump go to a run-scoped location named for that scenario

### Requirement: Readiness waits observe application state

A browser check SHALL wait for observable DOM or application state, or rely on
Playwright auto-waiting, instead of a fixed sleep. A fixed wait SHALL remain
only where elapsed time is the behavior under test.

**Source**: [Issue #294](https://github.com/hose1021/grimoria/issues/294)
**Tests**: `scripts/browser-check.ts`, `scripts/scenario-kit.ts`

#### Scenario: Action readiness

- **WHEN** a check acts and then asserts on a rendered result
- **THEN** it waits for that result instead of sleeping for a fixed duration

#### Scenario: Asynchronous behavior

- **WHEN** a check tests a service-worker update or cross-tab propagation
- **THEN** it keeps a bounded explicit wait that fails with a named timeout instead of passing at any speed

### Requirement: CI runs the browser pipeline without serializing independent jobs

Pull-request CI SHALL run the browser regression checks and the full-game
scenario suite as independent jobs that execute concurrently, and SHALL fail the
pull request when either job fails.

**Source**: [Issue #294](https://github.com/hose1021/grimoria/issues/294); `AGENTS.md` "Testing"
**Tests**: `.github/workflows/ci.yml`

#### Scenario: Parallel browser jobs

- **WHEN** CI runs on a pull request
- **THEN** the regression check job and the scenario job start independently instead of waiting for each other

#### Scenario: Coverage retained

- **WHEN** the jobs run
- **THEN** every browser case and all full-game scenarios still execute

#### Scenario: Job failure

- **WHEN** either browser job fails
- **THEN** the pull request check fails and the job name identifies the failing half
