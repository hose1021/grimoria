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
**Tests**: `src/core/model/scripts.test.ts`, `src/core/model/scripts.test.ts`

#### Scenario: Supported scripts

- **WHEN** the script catalog is loaded
- **THEN** Trouble Brewing, Bad Moon Rising and Sects and Violets are marked supported

### Requirement: Script parsing

The parser SHALL accept a BotC JSON array of role ids, an array of `{ id }`
objects with an optional `_meta` entry, and an object with a `roles` field; it
SHALL keep `_meta.name` and `_meta.author` and SHALL derive a stable custom id
from the script text.

**Source**: `SPEC.md` "Scenarios"
**Tests**: `src/core/model/scripts.test.ts`, `src/core/model/scripts.test.ts`, `src/core/model/scripts.test.ts`

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
**Tests**: `src/core/model/scripts.test.ts`, `src/core/model/scripts.test.ts`

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
**Tests**: `src/core/model/scripts.test.ts`, `src/core/model/scripts.test.ts`, `src/core/engine/manual.test.ts`

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
**Tests**: `src/core/engine/manual.test.ts`, `src/core/engine/manual.test.ts`, `src/core/engine/manual.test.ts`, `src/core/engine/manual.test.ts`

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
**Tests**: `src/entry/store.test.ts`

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
**Tests**: `src/core/model/support.test.ts`, `scripts/browser-check.ts`

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
and SHALL register each pair in the versioned interaction registry with a
behavior status and its asserting test. A pair SHALL NOT be verified from
membership alone. A pool that can trigger an `unsupported` pair SHALL NOT run
automatically.

**Source**: [Official resources `jinxes.json`](https://release.botc.app/resources/data/jinxes.json); `docs/official/jinxes.json`; [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/model/support.test.ts`, `src/core/model/script-definition.test.ts`, `src/core/engine/jinxes.test.ts`

#### Scenario: Official pair

- **WHEN** the registry is asked about two supported characters that have an
  official jinx
- **THEN** it returns the pair with its reason, snapshot source, behavior
  status and asserting test

#### Scenario: Pair without a jinx

- **WHEN** the registry is asked about two supported characters without an
  official jinx
- **THEN** it returns no pair

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
**Tests**: `src/core/model/support.test.ts`, `src/core/model/scripts.test.ts`, `src/core/engine/commands.test.ts`

#### Scenario: Unknown role at import

- **WHEN** a script lists a role id the catalog does not know
- **THEN** the import fails and the message names that role

#### Scenario: Unknown character in a jinx lookup

- **WHEN** either character of a requested jinx is outside the supported set
- **THEN** the lookup returns `unsupported` instead of `none`

#### Scenario: Unsupported ruleset version

- **WHEN** a command declares a version the build does not accept
- **THEN** it is rejected with `ruleset-version-unsupported` and the state is unchanged

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

### Requirement: Restore the saved custom pool with its bag

Loading a saved custom bag SHALL restore its saved role pool even when the
current custom script has the same identifier and a different pool.

**Source**: `SPEC.md` `/bag` saved-pool library contract; [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361).
**Tests**: `scripts/browser-check.ts`

#### Scenario: Reload after editing a same-ID custom pool

- **WHEN** a host saves a bag, removes one of its roles from the custom pool,
  then loads the saved bag without changing the script identifier
- **THEN** the saved pool and selected bag roles are restored successfully

### Requirement: A mixed script applies the shared protection rules

A certified mixed script SHALL apply the shared protection rules to every
death path: the Monk and Soldier against a Demon attack, and the BMR Fool, Tea
Lady, Sailor, Zombuul, Innkeeper and Devil's Advocate. The death cause SHALL
stay the real one and Demon attribution SHALL be separate. A prevented death
SHALL be journaled and SHALL leave the player alive.

**Source**: Monk r3124, Soldier r3121, Fool r2636, Tea Lady r1777, Sailor r1768,
Zombuul r3022, Innkeeper r3160, Devil's Advocate r2594, Fang Gu r2974;
[Issue #220](https://github.com/hose1021/grimoria/issues/220)
**Tests**: `src/core/engine/mixed.test.ts`

#### Scenario: Monk protection

- **WHEN** a mixed S&V Demon attacks a Monk-protected player
- **THEN** the player stays alive and a secret prevention is journaled

#### Scenario: Soldier

- **WHEN** a mixed S&V Demon attacks the Soldier
- **THEN** the Soldier stays alive

#### Scenario: Fool

- **WHEN** a mixed S&V Demon attacks the Fool for the first time
- **THEN** the Fool stays alive and its first-death ability is spent

#### Scenario: Innkeeper

- **WHEN** a mixed non-Demon ability attacks an Innkeeper-protected player
- **THEN** the player stays alive

#### Scenario: Devil's Advocate

- **WHEN** a mixed game executes a Devil's Advocate–protected player
- **THEN** the player stays alive

#### Scenario: Fang Gu jump

- **WHEN** the Fang Gu chooses a Monk-protected Outsider
- **THEN** no jump happens and the target and the old Demon stay alive

### Requirement: A mixed script applies the shared win rules

A mixed script SHALL apply the Vortox day-end win, the Evil Twin good-twin
execution and the Mastermind extra day when those characters are in the script.
The Mastermind extra day SHALL suspend the win while active. The shared Mayor
and demon-dead/two-alive rules SHALL stay unchanged.

**Source**: Vortox r3017, Evil Twin r3101, Mastermind r2993, Mayor r2995;
[Issue #220](https://github.com/hose1021/grimoria/issues/220)
**Tests**: `src/core/engine/mixed.test.ts`

#### Scenario: Vortox

- **WHEN** a mixed day ends with a living Vortox and no execution
- **THEN** evil wins with reason `vortox`

#### Scenario: Mastermind

- **WHEN** a mixed game executes the Demon while a Mastermind is active
- **THEN** the win is suspended and the extra day is armed

### Requirement: A mixed transformation swaps characters across editions

A death-triggered transformation in a mixed script SHALL swap two players'
characters even when the two roles come from different editions, and SHALL
keep the shared role and team records consistent.

**Source**: Barber r1757; [Issue #220](https://github.com/hose1021/grimoria/issues/220)
**Tests**: `src/core/engine/mixed.test.ts`

#### Scenario: Barber swap

- **WHEN** a mixed Barber swaps a TB and an S&V character
- **THEN** each player holds the other's character

### Requirement: Verified jinx behavior

Every official jinx SHALL have one implemented behavior, a pinned source and an
asserting behavioral test. A pair SHALL NOT be `verified` without that test. The
seven supported pairs SHALL be `verified`; the setup screens list no pair as
unsupported.

**Source**: `docs/official/jinxes.json` (committed 2026-11-11); [Issue #475](https://github.com/hose1021/grimoria/issues/475)
**Tests**: `src/core/engine/jinxes.test.ts`, `src/core/model/support.test.ts`

#### Scenario: Chambermaid and Mathematician

- **WHEN** the Chambermaid chooses an alive Mathematician and another player
- **THEN** the later Mathematician wake counts, and the answer is the number of
  chosen characters who woke tonight

#### Scenario: Drunk and Mathematician

- **WHEN** the Drunk's believed ability gives false information or fails
- **THEN** the Drunk carries an ABNORMAL reminder and the Mathematician counts
  the character once

#### Scenario: Fang Gu and Scarlet Woman

- **WHEN** the Fang Gu possession creates a second living Demon or another
  Demon lives at a Demon death
- **THEN** the Scarlet Woman remains a Minion

#### Scenario: Goon and Pit-Hag

- **WHEN** the Pit-Hag turns an evil player into the Goon and a good player
  later chooses the Goon
- **THEN** the chooser becomes drunk and the Goon stays evil

#### Scenario: Lunatic and Mathematician

- **WHEN** the Lunatic's chosen attack set differs from the acting Demon's,
  including a Demon that attacked nobody
- **THEN** the Lunatic carries one ABNORMAL reminder

#### Scenario: Mastermind and Vigormortis

- **WHEN** the Vigormortis killed the Mastermind, the Vigormortis later dies,
  and the Demon is executed
- **THEN** the dead Mastermind still arms the extra day

#### Scenario: Recluse and Sage

- **WHEN** the Sage is killed by the Demon and the Storyteller chooses a pair
  naming the Recluse
- **THEN** the pair is legal and the implied Recluse-as-Demon registration is
  journaled

### Requirement: Jinx host choices

A jinx that requires a Storyteller choice SHALL keep it as an existing
validated, journaled answer. The Sage pair and the Recluse registration SHALL
be stored on the step and reproduced by replay. No new command or state store
SHALL be introduced.

**Source**: [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009); [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007)
**Tests**: `src/core/engine/jinxes.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Recluse pair

- **WHEN** the host completes the Sage step with a pair naming the Recluse
- **THEN** the step stores the pair and a `registration: demon` answer, and the
  secret journal has both host-choice lines
