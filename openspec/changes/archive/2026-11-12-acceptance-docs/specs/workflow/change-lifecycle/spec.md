# Spec Delta

## ADDED Requirements

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
