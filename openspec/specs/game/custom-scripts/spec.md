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

### Requirement: Three-level character support

The app SHALL classify every supported character as `verified`,
`requires-storyteller-choice` or `unsupported` from the audited rules matrix,
SHALL classify an unknown character as `unsupported` with a reason, and SHALL
report a script's weakest level with the count in each level and the triggering
roles. A character with an official host choice or an unverified implementation
SHALL NOT be reported as `verified`.

**Source**: [Issue #44](https://github.com/hose1021/grimoria/issues/44);
`docs/rules-matrix.md` "Status legend"
**Tests**: `js/support.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: Fully verified script

- **WHEN** every role in a script is `verified`
- **THEN** the script level is `verified` and the unsupported count is zero

#### Scenario: Setup visibility

- **WHEN** the setup screen renders a selected script
- **THEN** it shows the script's level and the count in each of the three levels

#### Scenario: Mixed script

- **WHEN** a script contains a verified and an `unsupported` character
- **THEN** the script level is `unsupported` and the counts name both roles

#### Scenario: Unknown character

- **WHEN** a character id is not in the supported set
- **THEN** the classifier returns `unsupported` with an unknown-character reason

### Requirement: Versioned jinx table

The app SHALL keep a jinx table pinned to a committed official resources
snapshot, SHALL include every official pair whose two characters are supported,
SHALL give each pair its official reason and a source that names the snapshot,
and SHALL list the pairs a script can trigger. A pool that can trigger a jinx
SHALL be at most `requires-storyteller-choice`.

**Source**: [Official resources `jinxes.json`](https://release.botc.app/resources/data/jinxes.json);
`docs/official/jinxes.json`
**Tests**: `js/support.test.mjs`

#### Scenario: Official pair

- **WHEN** the lookup is asked for two supported characters that have an official jinx
- **THEN** it returns the pair with its reason and snapshot source

#### Scenario: Pair without a jinx

- **WHEN** the lookup is asked for two supported characters without an official jinx
- **THEN** it returns `none`

#### Scenario: Pair missing from the table

- **WHEN** the snapshot contains a supported pair that the table omits
- **THEN** the consistency test fails

### Requirement: Explicit unsupported results

The app SHALL reject an unknown role id at script import while naming it, SHALL
return `unsupported` for an unknown character in a jinx lookup, and SHALL reject
a ruleset version outside the supported set before any mutation. It SHALL NOT
treat any of these as a silent manual fallback.

**Source**: [Issue #44](https://github.com/hose1021/grimoria/issues/44);
`docs/rules-matrix.md` "Custom scripts"
**Tests**: `js/support.test.mjs`, `js/scripts.test.mjs`, `js/commands.test.mjs`

#### Scenario: Unknown role at import

- **WHEN** a script lists a role id the catalog does not know
- **THEN** the import fails and the message names that role

#### Scenario: Unknown character in a jinx lookup

- **WHEN** either character of a requested jinx is outside the supported set
- **THEN** the lookup returns `unsupported` instead of `none`

#### Scenario: Unsupported ruleset version

- **WHEN** a command declares a version the build does not accept
- **THEN** it is rejected with `ruleset-version-unsupported` and the state is unchanged
