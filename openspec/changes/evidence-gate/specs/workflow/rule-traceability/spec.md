# Spec Delta

## MODIFIED Requirements

### Requirement: Rule documentation carries identifiers

Each role SHALL have one rule document with a stable identifier for every
engine-relevant rule, its matrix row, pinned revision and asserting tests. Shared
rows SHALL be declared in the same shape in `docs/rules-shared.md`. Every
supported matrix row SHALL carry exactly one identifier in its first column:
`TB|BMR|SNV-<ROLE>-NN` for a role row and `SYS-<AREA>-NN` for a shared row. A
document SHALL reference sources instead of copying ability text.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177) "requirement IDs", [Issue #221](https://github.com/hose1021/grimoria/issues/221) "one identifier per row"
**Tests**: `scripts/check-acceptance.ts`, `scripts/rules-for.test.ts`

#### Scenario: A documented rule

- **WHEN** a role document lists a rule
- **THEN** the rule has an identifier, a matrix row, a pinned source revision and a named test

#### Scenario: A duplicate identifier

- **WHEN** two documents declare the same identifier
- **THEN** the acceptance check fails and names the identifier

#### Scenario: A matrix row without an identifier

- **WHEN** a matrix row with a supported status carries no identifier or more than one
- **THEN** the acceptance check fails and names the row

#### Scenario: An orphan identifier

- **WHEN** a role or shared document declares an identifier that no matrix row carries
- **THEN** the acceptance check fails and names the identifier and its document

### Requirement: Rule identifiers in test names

A test cited as the asserting test of a verified rule SHALL carry that rule's
identifier in its name. A test name SHALL stay unique within its file. A verified
matrix row SHALL cite at least one test whose name carries the row's own
identifier.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177) "requirement IDs in test names", [Issue #221](https://github.com/hose1021/grimoria/issues/221) "strict per-row gate"
**Tests**: `scripts/check-acceptance.ts`

#### Scenario: A test asserts a rule

- **WHEN** a rule is marked verified and its document names a test
- **THEN** that test's name contains the rule identifier

#### Scenario: A verified row whose tests lack the row identifier

- **WHEN** a verified matrix row cites only test names that carry no identifier or another rule's identifier
- **THEN** the acceptance check fails and names the row and its identifier

### Requirement: Verified rows resolve to an asserting test

The acceptance check SHALL fail when a matrix row marked `verified` cites a test
that does not exist, does not pass, or whose name lacks the row's own identifier,
when the identifier is absent from the role or shared documentation, or when the
documented level differs from the row's level.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177) "extend the check", [Issue #221](https://github.com/hose1021/grimoria/issues/221) "strict per-row gate", `docs/rules-matrix.md` "Status legend"
**Tests**: `scripts/check-acceptance.ts`, `scripts/check-acceptance.test.ts`, `scripts/rule-traceability.test.ts`

#### Scenario: A verified row without an identifier

- **WHEN** a verified matrix row cites a test name that contains no rule identifier
- **THEN** the acceptance check fails and names the row and the test

#### Scenario: A verified row whose identifier is undeclared

- **WHEN** the cited test carries an identifier that no rule document declares
- **THEN** the acceptance check fails

#### Scenario: The documented rule is not verified

- **WHEN** the cited identifier belongs to a rule documented as a host choice or unsupported
- **THEN** the acceptance check fails

## ADDED Requirements

### Requirement: Shared rule document

`docs/rules-shared.md` SHALL declare every `SYS-` identifier used by a matrix
row. Each declaration SHALL carry the row's level, the pinned revision that row
names or an explicit application-contract marker, and the asserting test names.
The shared rows SHALL be grouped by area: nominations and votes, WINS, night,
effects, replay and state, scripts, privacy and localization.

**Source**: [Issue #221](https://github.com/hose1021/grimoria/issues/221) "shared rules"
**Tests**: `scripts/check-acceptance.ts`, `scripts/rule-traceability.test.ts`

#### Scenario: A valid shared row

- **WHEN** a shared matrix row carries a `SYS-` identifier that the shared document declares with the same level
- **THEN** the acceptance check accepts the row

#### Scenario: A shared row without a `SYS-` identifier

- **WHEN** a shared matrix row carries a role identifier or no identifier
- **THEN** the acceptance check fails and names the row

#### Scenario: A declared shared rule without a test

- **WHEN** a shared rule is `verified` and its document cites no test whose name carries its identifier
- **THEN** the acceptance check fails and names the identifier
