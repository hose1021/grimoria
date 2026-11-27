## MODIFIED Requirements

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

#### Scenario: Navigate to a lazy screen

- **WHEN** a full-game scenario navigates to a screen to inspect its controls or text
- **THEN** it waits for the requested screen before inspecting its contents, and a route mismatch fails with the expected and observed routes
