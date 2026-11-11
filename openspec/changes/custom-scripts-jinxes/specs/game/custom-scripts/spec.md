# Spec Delta

## ADDED Requirements

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
