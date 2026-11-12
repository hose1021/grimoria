# app/design-tokens Specification

## Purpose
Defines one visual token source for the new UI so the shell and the legacy
screens keep the same palette, spacing and typography while both exist.

## Requirements

### Requirement: One token source

The application SHALL declare colours, spacing, radius and typography once, in
the `@theme` block of the global stylesheet, and SHALL NOT declare the same
value a second time. A screen SHALL read a value through a utility class or a
custom-property reference to that block. A visual value the block does not
define SHALL be added to it before use.

**Source**: `SPEC.md` "Design"; issue #69, issue #137
**Tests**: `scripts/check-types-policy.test.mjs`, `scripts/style-parity.mjs`

#### Scenario: Values agree

- **WHEN** a token is read from the theme block and from a utility class that
  uses it
- **THEN** both render the same value

#### Scenario: New value needs a source

- **WHEN** a screen needs a colour the theme does not define
- **THEN** the value is added to the theme block, not to a component, an
  arbitrary value or an inline style

#### Scenario: Nothing is defined twice

- **WHEN** the same value is declared in the theme block and again in a base or
  component rule
- **THEN** the policy check reports the duplicate declaration

### Requirement: Token use is checked

A repository check SHALL fail when the repository tracks a second stylesheet,
when the theme declares a token that no utility class or rule uses, or when a
custom-property reference resolves to no declared token. The check SHALL run in
the same gate as the type and boundary checks.

**Source**: `AGENTS.md` "Development Commands"; issue #69, issue #137
**Tests**: `scripts/check-types-policy.mjs`, `scripts/check-types-policy.test.mjs`

#### Scenario: Missing token

- **WHEN** a screen or the stylesheet references a custom property that the
  theme does not declare
- **THEN** the check exits non-zero and names the file and the property

#### Scenario: Changed value

- **WHEN** a theme value changes and the recorded computed-style baseline still
  expects the old value
- **THEN** the parity check fails instead of shipping a silent visual change

#### Scenario: Extra stylesheet

- **WHEN** a stylesheet other than the global one is tracked
- **THEN** the check exits non-zero and names the file

#### Scenario: Unused token

- **WHEN** the theme declares a token that no class or rule uses
- **THEN** the check exits non-zero and names the token

### Requirement: One global stylesheet

The application SHALL ship one global stylesheet built from the Tailwind
theme, one explicit base reset and utilities. Beyond the directives, the font
face, the theme values, the source entries, the variants, the keyframes and
document-level base rules, it SHALL contain no rule that styles a screen.
Screen styling SHALL be a utility class in the markup, or a shared component
when a group of utilities repeats.

**Source**: issue #137; `AGENTS.md` "Code Conventions"
**Tests**: `scripts/check-types-policy.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: One stylesheet in the artifact

- **WHEN** the built document is inspected
- **THEN** it loads one stylesheet from the origin, and that sheet carries the
  theme values, the reset and the utilities

#### Scenario: Screen styling lives in the markup

- **WHEN** a screen element is inspected
- **THEN** its declarations come from utility classes or a shared component,
  and no stylesheet rule targets a screen prefix

#### Scenario: A second stylesheet

- **WHEN** a change adds a stylesheet other than the global one
- **THEN** the policy check names both files and exits non-zero
