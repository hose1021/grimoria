# Custom Scripts Specification

## Purpose

Defines how a custom script is parsed, validated, limited to supported roles
and played, including the explicit manual-only mode for a pool that mixes
editions.

## Requirements

### Requirement: Official script catalog

The app SHALL expose the three core scenario scripts as supported and SHALL
include the full playable Trouble Brewing roster.

**Source**: `SPEC.md` "Scenarios"; `docs/rules-sources.md` "Primary sources"
**Tests**: `js/scripts.test.mjs:36`, `js/scripts.test.mjs:44`

#### Scenario: Supported scripts

- **WHEN** the script catalog is loaded
- **THEN** Trouble Brewing, Bad Moon Rising and Sects and Violets are marked supported

### Requirement: Script parsing

The parser SHALL accept a BotC JSON array of role ids, an array of `{ id }`
objects with an optional `_meta` entry, and an object with a `roles` field; it
SHALL keep `_meta.name` and `_meta.author` and SHALL derive a stable custom id
from the script text.

**Source**: `SPEC.md` "Scenarios"
**Tests**: `js/scripts.test.mjs:53`, `js/scripts.test.mjs:67`, `js/scripts.test.mjs:114`

#### Scenario: Meta entry

- **WHEN** the script JSON contains `_meta` with a name and author
- **THEN** the parsed script keeps both values

#### Scenario: Stable id

- **WHEN** the same script text is parsed twice
- **THEN** both parses produce the same custom id

### Requirement: Script rejection

The parser SHALL reject unknown or unsupported role ids, Traveller-only
additions, scripts with fewer than five playable roles, and scripts that miss a
required team, and SHALL name the offending roles.

**Source**: `SPEC.md` "Scenarios"; `docs/rules-sources.md` "Known limitations"
**Tests**: `js/scripts.test.mjs:80`, `js/scripts.test.mjs:100`

#### Scenario: Unknown role

- **WHEN** the script lists a role id the catalog does not know
- **THEN** the import fails and the message names that role

#### Scenario: Missing team

- **WHEN** the script has no Demon
- **THEN** the import fails

### Requirement: Same-edition custom script

A custom script whose roles all belong to one supported edition SHALL deal and
play through that edition's engine, and state validation SHALL reject a role
outside the selected script.

**Source**: `SPEC.md` "Scenarios"
**Tests**: `js/scripts.test.mjs:138`, `js/scripts.test.mjs:157`, `js/manual.test.mjs:71`

#### Scenario: All Trouble Brewing

- **WHEN** a custom script contains only Trouble Brewing roles
- **THEN** the game deals and starts a night with the Trouble Brewing behavior

#### Scenario: Role outside the script

- **WHEN** an assignment contains a role the selected script does not list
- **THEN** state validation reports it

### Requirement: Mixed-edition manual mode

A pool that mixes supported editions SHALL be rejected unless explicit
manual-only mode is set; in manual-only mode the host deals and resolves every
ability without automatic protection or win checks, and manual corrections
survive validation and can be cleared.

**Source**: `SPEC.md` "Scenarios"; `docs/rules-sources.md` "Known limitations"
**Tests**: `js/manual.test.mjs:30`, `js/manual.test.mjs:63`, `js/manual.test.mjs:114`, `js/manual.test.mjs:139`

#### Scenario: Mixed pool without the flag

- **WHEN** a mixed-edition pool deals without manual-only mode
- **THEN** the deal fails

#### Scenario: Manual kill

- **WHEN** the host records a manual kill in manual-only mode
- **THEN** automatic protection does not block it

### Requirement: Script travels with the game

The selected script SHALL survive save and reload, including a custom script
definition.

**Source**: `SPEC.md` "State v4"
**Tests**: `js/store.test.mjs:127`

#### Scenario: Custom script reload

- **WHEN** a game with a custom script is saved and reloaded
- **THEN** the script id, name and roles are unchanged
