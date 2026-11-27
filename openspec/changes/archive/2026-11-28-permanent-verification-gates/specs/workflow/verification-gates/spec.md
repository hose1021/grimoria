# Spec Delta

## ADDED Requirements

### Requirement: Machine-readable rule, engine and UI traceability

The repository SHALL keep a committed `docs/audits/verification-gates/traceability.json` that resolves every supported official rule to engine rule IDs, current engine test identities, UI contract IDs and UI test artifacts. A rule with no engine row, no current test or no UI surface SHALL be recorded in `uncovered.json` with a reason and, where one exists, an issue. A stale generated file SHALL fail the gate.

**Source**: [Issue #332](https://github.com/hose1021/grimoria/issues/332); `docs/audits/verification-gates/README.md`
**Tests**: `src/verification/contracts.test.ts`, `scripts/verification/gates.ts`

#### Scenario: Current trace

- **WHEN** `build-trace.ts --check` runs after a rule or contract change
- **THEN** it fails until the generated trace, uncovered register and matrices are regenerated

#### Scenario: Unmapped rule

- **WHEN** an official rule has no engine rule or no current test
- **THEN** its row is `UNMAPPED` or `ENGINE_UNVERIFIED` and an `uncovered.json` entry names the reason and task

### Requirement: Architecture and test-identity gates

The verification gate SHALL fail on a forbidden layer import, a UI value import of `src/core/engine`, a removed manifest test, a stale manifest, a verified engine rule without a current test carrying its ID, or a gate-covered UI contract without an existing test artifact.

**Source**: [Issue #332](https://github.com/hose1021/grimoria/issues/332); `docs/audits/verification-gates/architecture.md`
**Tests**: `src/verification/architecture.test.ts`, `src/verification/contracts.test.ts`, `scripts/verification/gates.ts`

#### Scenario: Architecture edge

- **WHEN** `core` imports `application` or `ui` imports the engine
- **THEN** the gate fails and names the file and edge

#### Scenario: Removed test

- **WHEN** a test in `test-manifest.json` no longer exists
- **THEN** `test-index.ts --check` and the gate fail

### Requirement: Independent selector and model checks

The verification suite SHALL test the mechanically significant selectors and view models with independent expected values, and SHALL exercise legal game transitions without using the UI helper under test as the oracle. The checks SHALL cover the poison projection, the execution threshold, the registered-dead public count, the given gate, the consequence categories and a multi-day legal game.

**Source**: [Issue #332](https://github.com/hose1021/grimoria/issues/332)
**Tests**: `src/application/read-models/verification.test.ts`, `src/core/engine/model-based.test.ts`, `src/ui/screens/table/step-context.verification.test.ts`

#### Scenario: Poison projection

- **WHEN** a player has a poison effect
- **THEN** the seat projection reports poison and impairment; a drunk-only effect reports drunk, not poison

#### Scenario: Multi-day invariant

- **WHEN** a legal Trouble Brewing game resolves several nights and days
- **THEN** living + dead equals the roster, the threshold is `ceil(living / 2)`, the order is unique and the public projection carries no role/note/bluff/effect field

### Requirement: Action reachability and known findings

Every command SHALL have exactly one reachability class: UI, product-scoped, internal or missing. A missing legal action SHALL name an issue. The findings suite SHALL assert the expected correct behavior for confirmed defects and SHALL fail until the linked issues are fixed; no skip or allowlist SHALL hide a finding.

**Source**: [Issue #332](https://github.com/hose1021/grimoria/issues/332); `docs/audits/verification-gates/known-findings.md`
**Tests**: `src/verification/action-reachability.test.ts`, `scripts/verification/findings.test.ts`, `scripts/verification/gates.ts`

#### Scenario: Missing action

- **WHEN** a command has no UI caller and no product/internal classification
- **THEN** it is `missing` with an issue and the findings gate fails

#### Scenario: Known UI finding

- **WHEN** a UI contract is non-compliant or only static
- **THEN** the findings gate lists it and does not report a green baseline

### Requirement: CI cost separation

The repository SHALL run fast semantic checks on every pull request, keep the existing full unit/browser/scenario jobs as the extended integration layer, and run mutation probes only on schedule or explicit dispatch. A passing line-coverage percentage SHALL NOT be the acceptance criterion.

**Source**: [Issue #332](https://github.com/hose1021/grimoria/issues/332); `.github/workflows/verification.yml`
**Tests**: `scripts/verification/gates.ts`, `scripts/verification/mutation.ts`

#### Scenario: Fast PR gate

- **WHEN** a pull request changes a rule, contract or test
- **THEN** the semantic job runs the trace, architecture, contract, selector and model checks without a browser

#### Scenario: Mutation scope

- **WHEN** the mutation job runs on schedule
- **THEN** it applies five critical probes in a temporary copy and fails on a survivor
