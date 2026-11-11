# workflow/change-lifecycle Specification

## Purpose
Defines how work moves from a GitHub issue through an OpenSpec change, a pull
request and CI to a merge, and when the main specifications may change.

## Requirements

### Requirement: Issue-backed change

The project SHALL start every implementation change from a GitHub issue and an
OpenSpec change whose proposal names that issue.

**Source**: [Issue #19](https://github.com/hose1021/pocket-grimoire-go/issues/19), `AGENTS.md` "Merge Policy"
**Tests**: `scripts/openspec-check.mjs`, `.github/workflows/openspec.yml`

#### Scenario: New mechanic

- **WHEN** work starts on a new mechanic or behavior change
- **THEN** a GitHub issue and an OpenSpec change exist before implementation, and the proposal names the issue

#### Scenario: Change without an issue

- **WHEN** a change's proposal has no issue reference
- **THEN** the OpenSpec consistency check fails

### Requirement: Complete change artifacts

Every OpenSpec change SHALL contain a proposal, at least one delta spec, a
design and a task list before implementation begins.

**Source**: `openspec/schemas` "spec-driven" artifact set
**Tests**: `scripts/openspec-check.mjs`

#### Scenario: Missing design

- **WHEN** a change directory has a proposal and tasks but no `design.md`
- **THEN** the consistency check reports the missing artifact

### Requirement: Test-first evidence

A change that alters behavior SHALL add a failing test first, SHALL record the
RED command and observed failure, and SHALL record the GREEN result after the
implementation; an existing test SHALL NOT be weakened or deleted to pass.

**Source**: [Issue #19](https://github.com/hose1021/pocket-grimoire-go/issues/19) "Обязательный процесс TDD"
**Tests**: `scripts/openspec-check.mjs` (evidence block), `.github/pull_request_template.md`

#### Scenario: Behavior change

- **WHEN** a change implements a rule
- **THEN** its tasks and pull request record the RED failure and the GREEN result

#### Scenario: Documentation-only change

- **WHEN** a change touches no runtime behavior
- **THEN** its evidence block states that no RED test applies and names the check that proves the change

### Requirement: Verified sync

A completed change SHALL update the main specifications only after the
implementation is verified by the test suite and the OpenSpec checks, and all
its tasks are complete.

**Source**: `AGENTS.md` "Merge Policy"
**Tests**: `.github/workflows/openspec.yml`, `scripts/openspec-check.mjs`

#### Scenario: Unchecked task

- **WHEN** a change is archived with an unchecked task
- **THEN** the archive validation reports the incomplete task

#### Scenario: Main spec write before verification

- **WHEN** a change is synced without a passing test run
- **THEN** the sync is not performed

### Requirement: Owner-controlled merge

An agent SHALL NOT merge a pull request, enable auto-merge, approve its own
change, or change `main` directly without an explicit owner instruction naming
that pull request.

**Source**: `AGENTS.md` "Merge Policy"
**Tests**: `.github/pull_request_template.md`, `.github/workflows/openspec.yml`

#### Scenario: Agent finishes

- **WHEN** the implementation and checks are complete
- **THEN** the agent opens a pull request, reports the CI result and stops

#### Scenario: Explicit permission

- **WHEN** the owner writes `merge PR #N`
- **THEN** that one pull request may be merged

### Requirement: Evidence-backed claims

Every requirement in a main spec SHALL cite an official source and at least one
existing test, and a mechanic that is partial, host-adjudicated or unsupported
SHALL NOT be written as a requirement.

**Source**: `docs/rules-matrix.md` "Status legend", [Issue #19](https://github.com/hose1021/pocket-grimoire-go/issues/19) "Definition of Done"
**Tests**: `scripts/openspec-check.mjs`

#### Scenario: Missing test reference

- **WHEN** a requirement has no `**Tests**:` line or names a missing file
- **THEN** the consistency check fails

#### Scenario: Unverified mechanic

- **WHEN** a mechanic has no asserting test
- **THEN** it stays in `docs/rules-matrix.md` or issue #19 and is not added to a main spec

### Requirement: Pull request traceability

A pull request that changes `openspec/changes/**` SHALL name its OpenSpec change
and its GitHub issue in the body.

**Source**: `AGENTS.md` "Merge Policy"
**Tests**: `scripts/openspec-check.mjs`, `.github/workflows/openspec.yml`

#### Scenario: Missing reference

- **WHEN** such a pull request body lacks the change or issue line
- **THEN** the OpenSpec CI job fails

#### Scenario: Older pull request

- **WHEN** a pull request does not touch `openspec/changes/**`
- **THEN** the body rule does not apply to it

### Requirement: Verified matrix rows cite passing tests

Every `docs/rules-matrix.md` row marked `verified` SHALL cite at least one test
by file and test name. The cited file SHALL exist, the cited test SHALL exist,
and it SHALL pass in the test suite. A line-number-only citation SHALL NOT
satisfy a `verified` row.

**Source**: `docs/rules-matrix.md` "Status legend", [Issue #46](https://github.com/hose1021/grimoria/issues/46)
**Tests**: `scripts/check-acceptance.mjs`

#### Scenario: Verified row with a passing test

- **WHEN** a matrix row says `verified`
- **THEN** its Test cell names an existing test file and test, and that test passes in the suite

#### Scenario: Stale citation

- **WHEN** a verified row cites only a line number, or a test name that does not pass
- **THEN** the acceptance check fails

#### Scenario: Missing test

- **WHEN** a verified row cites a test file or test name that does not exist
- **THEN** the acceptance check fails

### Requirement: One documented support level

The repository SHALL keep one character support classification derived from
`docs/rules-matrix.md`. The README support table and the secrets screen SHALL
report the same per-scenario counts as that model. Every supported character
SHALL have a screen support entry; a character that is not fully automated SHALL
be listed as `host-choice` or `unsupported`, never omitted, and an unknown
character SHALL be explicitly `unsupported`. No second support table SHALL
exist.

**Source**: `docs/rules-matrix.md` "Status legend", [Issue #46](https://github.com/hose1021/grimoria/issues/46)
**Tests**: `scripts/check-acceptance.mjs`, `js/support.test.mjs`

#### Scenario: Documentation disagrees with the model

- **WHEN** the README table or the secrets screen reports counts that differ from the support model
- **THEN** the acceptance check fails

#### Scenario: Silent manual fallback

- **WHEN** a supported character is not fully automated
- **THEN** it has a screen support entry marked `host-choice` or `unsupported`

#### Scenario: Unknown character

- **WHEN** an unknown character reaches the support classifier
- **THEN** it is marked `unsupported` instead of being omitted

#### Scenario: One support source

- **WHEN** a second support table is introduced outside the shared model
- **THEN** the acceptance check fails
