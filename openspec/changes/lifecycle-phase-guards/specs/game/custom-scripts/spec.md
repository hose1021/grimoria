# Custom Scripts Specification

## ADDED Requirements

### Requirement: Manual-only boundary

`manualOnly: true` SHALL be accepted only for a script whose roles span more
than one supported edition. A single-edition custom script SHALL always use its
matching automatic engine. Script import SHALL reject a stray flag with a named
error, and a legacy saved flag SHALL be cleared on load.

**Source**: `SPEC.md` "Scenarios"; `docs/rules-sources.md` "Known limitations"
**Tests**: `src/core/engine/manual.test.ts`, `src/core/model/state.test.ts`

#### Scenario: Same-edition script with the flag

- **WHEN** a custom script holds only Trouble Brewing roles and requests `manualOnly: true`
- **THEN** the import is rejected, the previous script stays selected and no game field changes

#### Scenario: Same-edition script without the flag

- **WHEN** a single-edition custom script is dealt
- **THEN** the matching automatic night queue and win check run and `manualOnly` stays false

#### Scenario: Legacy save with a stray flag

- **WHEN** a saved single-edition custom script carries `manualOnly: true`
- **THEN** load normalizes it to automatic mode and the state validates

#### Scenario: Mixed pool still needs the flag

- **WHEN** a script mixes supported editions
- **THEN** it reconciles the flag to `true` and keeps manual-only play
