# app/design-tokens Specification

## Purpose
Defines one visual token source for the new UI so the shell and the legacy
screens keep the same palette, spacing and typography while both exist.

## Requirements

### Requirement: One token source

The new UI SHALL read its colours, spacing and typography from the tokens
already defined in `css/app.css`. It SHALL NOT introduce a second palette, and a
token used by the UI SHALL NOT carry a different value in the shell than in the
legacy stylesheet. A new visual value SHALL be added to the shared source first.

**Source**: `SPEC.md` "Design"; issue #69
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Values agree

- **WHEN** a token used by the shell is read from both stylesheets
- **THEN** the values are equal

#### Scenario: New value needs a source

- **WHEN** the shell needs a colour the shared source does not define
- **THEN** the value is added to the source, not defined only in the shell

### Requirement: Token use is checked

A repository check SHALL fail when the shell references a token the source does
not define, or when a source token used by the shell changes value. The check
SHALL run in the same gate as the type and boundary checks.

**Source**: `AGENTS.md` "Development Commands"; issue #69
**Tests**: `scripts/check-types-policy.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: Missing token

- **WHEN** the shell uses a token absent from the source
- **THEN** the check exits non-zero and names the token and the file

#### Scenario: Changed value

- **WHEN** the source token changes value but the shell expects the old one
- **THEN** the check fails instead of shipping a silent visual change
