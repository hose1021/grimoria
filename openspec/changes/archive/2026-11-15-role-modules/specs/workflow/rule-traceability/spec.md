# Spec Delta

## Purpose

Defines how a role rule stays traceable from its official text to its asserting
test: stable rule identifiers in the role documentation and in test names, a
check that connects a verified matrix row to its test, and a per-role lookup.

## ADDED Requirements

### Requirement: Rule documentation carries identifiers

Each role SHALL have one rule document that gives every engine-relevant rule of
that role a stable identifier, its matrix row, the pinned source revision and the
asserting test names. The document SHALL reference the matrix and the official
snapshot instead of copying the ability text.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177) "requirement IDs"
**Tests**: `scripts/check-acceptance.mjs`, `scripts/rules-for.test.mjs`

#### Scenario: A documented rule

- **WHEN** a role document lists a rule
- **THEN** the rule has an identifier, a matrix row, a pinned source revision and a named test

#### Scenario: A duplicate identifier

- **WHEN** two role documents declare the same identifier
- **THEN** the acceptance check fails and names the identifier

### Requirement: Rule identifiers in test names

A test cited as the asserting test of a verified rule SHALL carry that rule's
identifier in its name. A test name SHALL stay unique within its file.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177) "requirement IDs in test names"
**Tests**: `scripts/check-acceptance.mjs`

#### Scenario: A test asserts a rule

- **WHEN** a rule is marked verified and its document names a test
- **THEN** that test's name contains the rule identifier

### Requirement: Verified rows resolve to an asserting test

The acceptance check SHALL fail when a matrix row marked `verified` cites a test
whose name lacks an identifier declared for that role, when the identifier is
absent from the role documentation, or when the cited test does not exist or
does not pass.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177) "extend the check", `docs/rules-matrix.md` "Status legend"
**Tests**: `scripts/check-acceptance.mjs`, `scripts/check-acceptance.test.mjs`

#### Scenario: A verified row without an identifier

- **WHEN** a verified matrix row cites a test name that contains no rule identifier
- **THEN** the acceptance check fails and names the row and the test

#### Scenario: A verified row whose identifier is undeclared

- **WHEN** the cited test carries an identifier that the role's rule document does not declare
- **THEN** the acceptance check fails

#### Scenario: The documented rule is not verified

- **WHEN** the cited identifier belongs to a rule documented as a host choice or unsupported
- **THEN** the acceptance check fails

### Requirement: Per-role rule lookup

`node scripts/rules-for.mjs <roleId>` SHALL print, for any supported role, its
official text from the committed snapshot, its matrix rows, the main-spec
requirements that mention it, the tests carrying its rule identifiers and its
jinx pairs. An unknown or missing identifier SHALL exit non-zero with one message
and no other output.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177) "`rules-for.mjs <roleId>`"
**Tests**: `scripts/rules-for.test.mjs`

#### Scenario: Look up a supported role

- **WHEN** the script runs with a supported role identifier
- **THEN** it prints all five sections and exits zero

#### Scenario: Unknown role

- **WHEN** the script runs with an unknown identifier, or with no argument
- **THEN** it exits non-zero with one message and prints nothing else
