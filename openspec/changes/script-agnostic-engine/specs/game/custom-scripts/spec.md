# Spec Delta

## ADDED Requirements

### Requirement: Script definition

A script SHALL describe its characters, origin, ruleset revision, teams, night
order, applicable jinxes and one compatibility verdict. The definition SHALL be
pure data and SHALL NOT select a scenario-specific engine.

**Source**: [Issue #475](https://github.com/hose1021/grimoria/issues/475); `docs/adr/0003-script-agnostic-engine.md`
**Tests**: `src/core/model/script-definition.test.ts`, `src/core/model/night-order.test.ts`

#### Scenario: Discovered order

- **WHEN** a script definition is built
- **THEN** its first and other night orders contain the script's waking
  characters in the official order

#### Scenario: Official origin

- **WHEN** the three official scripts are defined
- **THEN** each keeps its official origin and roster

### Requirement: Compatibility verdict

The verdict SHALL combine per-role support with registered interaction statuses,
SHALL be recomputed from pinned tables and SHALL NOT be trusted from saved data.
`verified` SHALL require every role and interaction to be behavior-tested;
`requires-storyteller-choice` SHALL keep the validated host-choice path;
`unsupported` SHALL refuse automatic play.

**Source**: [Issue #475](https://github.com/hose1021/grimoria/issues/475); `docs/official/jinxes.json`
**Tests**: `src/core/model/script-definition.test.ts`

#### Scenario: Verified mixed pool

- **WHEN** every character is verified and no registered interaction joins two
  of them
- **THEN** the level is `verified` and automatic play is on

#### Scenario: Host choice remains automatic

- **WHEN** a character is `requires-storyteller-choice`
- **THEN** the level is `requires-storyteller-choice` and automatic play stays
  available through the journaled host-choice path

#### Scenario: Unknown character

- **WHEN** the pool names an unknown character
- **THEN** the level is `unsupported`, automatic play is off and the character
  is named

### Requirement: Certified mixed-script composition

A certified mixed script's night queue SHALL compose every edition's role steps,
order them by the official nightsheet, emit one system pair and keep each step
key. An exact single-edition script SHALL keep its builder, keys and journals.

**Source**: [Issue #475](https://github.com/hose1021/grimoria/issues/475); `docs/official/nightsheet.json`
**Tests**: `src/core/engine/mixed.test.ts`, `src/core/model/night-order.test.ts`

#### Scenario: One queue across three editions

- **WHEN** a certified mixed script starts its first night
- **THEN** its queue contains the TB, BMR and S&V role steps in official order

#### Scenario: Cross-edition effect

- **WHEN** a Sailor, Poisoner or Courtier names a character of another edition
- **THEN** the existing effect graph applies the drunk or poison to that seat

#### Scenario: Replay

- **WHEN** the mixed game's journal is replayed
- **THEN** the canonical state is identical, including the second night queue

#### Scenario: Existing edition unchanged

- **WHEN** an exact TB, BMR or S&V script builds its queue
- **THEN** the same builder, step keys and journal result as before are used

### Requirement: Versioned interaction registry

Every official jinx SHALL have a registered pair, reason, pinned source and pin,
status, status reason and, when `verified`, an asserting test. Membership alone
SHALL NOT make a pair `verified`. An unclassified pair SHALL fail at load.

**Source**: `docs/official/jinxes.json` (committed 2026-11-11); [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/model/script-definition.test.ts`, `src/core/model/support.test.ts`

#### Scenario: Membership is not behavior

- **WHEN** an official pair has no joint implementation or asserting test
- **THEN** its status is `unsupported` and a pool containing it is not
  automatically runnable

#### Scenario: Unclassified official pair

- **WHEN** the snapshot gains a pair the registry does not classify
- **THEN** loading the registry fails

#### Scenario: Verified interaction

- **WHEN** an interaction is `verified`
- **THEN** it names an asserting test

### Requirement: Mixed-script diagnostics

The bag, setup and help screens SHALL show role counts, every non-verified
interaction by pair and status, and whether a mixed pool is automatic or needs
the explicit manual fallback.

**Source**: [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Unsupported interaction in the picker

- **WHEN** an imported pool can trigger an unsupported interaction
- **THEN** the picker names the pair and shows the manual fallback

#### Scenario: Certified mixed pool

- **WHEN** a mixed pool is certified
- **THEN** the screens say automatic play is on and no fallback is required

## MODIFIED Requirements

### Requirement: Versioned jinx table

The app SHALL keep a jinx table pinned to a committed official resources
snapshot, SHALL include every official pair whose two characters are supported,
SHALL give each pair its official reason and a source that names the snapshot,
and SHALL register each pair in the versioned interaction registry with a
behavior status. A pair SHALL NOT be verified from membership alone. A pool
that can trigger an `unsupported` pair SHALL NOT run automatically.

**Source**: [Official resources `jinxes.json`](https://release.botc.app/resources/data/jinxes.json); `docs/official/jinxes.json`; [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/model/support.test.ts`, `src/core/model/script-definition.test.ts`

#### Scenario: Official pair

- **WHEN** the registry is asked about two supported characters that have an
  official jinx
- **THEN** it returns the pair with its reason, snapshot source and behavior
  status

#### Scenario: Pair without a jinx

- **WHEN** the registry is asked about two supported characters without an
  official jinx
- **THEN** it returns no pair

#### Scenario: Pair missing from the table

- **WHEN** the snapshot contains a supported pair that the table omits
- **THEN** the consistency test fails


### Requirement: Script rejection

The parser SHALL reject unknown or unsupported role ids, Traveller-only
additions, scripts with fewer than five playable roles, and scripts that miss a
required team, and SHALL name the offending roles. A pool of supported roles
that spans editions SHALL be accepted as a custom script; its compatibility
verdict decides whether it runs automatically or needs the explicit manual
fallback.

**Source**: `SPEC.md` "Scenarios"; `docs/rules-sources.md` "Known limitations";
[Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/model/scripts.test.ts`,
`src/core/engine/setup.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Unknown role

- **WHEN** the script lists a role id the catalog does not know
- **THEN** the import fails and the message names that role

#### Scenario: Missing team

- **WHEN** the script has no Demon
- **THEN** the import fails

#### Scenario: Mixed supported pool

- **WHEN** the script lists supported roles from more than one edition
- **THEN** the import succeeds and the script keeps every supported role

### Requirement: Mixed-edition manual mode

Manual-only mode SHALL be the explicit fallback for a script whose compatibility
verdict is `unsupported`; it SHALL remain legal only for a script that spans
more than one supported edition. A certified mixed script SHALL run
automatically without the flag, and a stray single-edition flag SHALL still be
cleared on load. In manual-only mode the host deals and resolves every ability
without automatic protection or win checks, and manual corrections survive
validation and can be cleared.

**Source**: `SPEC.md` "Scenarios"; `docs/rules-sources.md` "Known limitations";
[Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/engine/manual.test.ts`,
`src/core/model/state.test.ts`, `src/core/engine/mixed.test.ts`

#### Scenario: Mixed pool without the flag

- **WHEN** a mixed pool has a verdict other than `unsupported` and no manual
  flag
- **THEN** it deals, builds its composed queue and runs the automatic win check

#### Scenario: Unsupported mixed pool

- **WHEN** the verdict is `unsupported`
- **THEN** automatic dealing is refused and the explicit manual fallback is
  required

#### Scenario: Certified mixed pool

- **WHEN** a certified mixed pool is selected
- **THEN** the setup screens report automatic play and no manual fallback

#### Scenario: Manual kill

- **WHEN** the host records a manual kill in manual-only mode
- **THEN** automatic protection does not block it

#### Scenario: Same-edition script with the flag

- **WHEN** a custom script holds only one edition's roles and requests
  `manualOnly: true`
- **THEN** the import is rejected and the previous script stays selected
