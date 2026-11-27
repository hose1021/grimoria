# Spec Delta

## ADDED Requirements

### Requirement: Host-choice contract

The engine SHALL name every discretionary Storyteller decision by one closed
case id, SHALL attach a Storyteller-facing reason to that case, and SHALL expose
the case list and reasons to the screens and the journal.

**Source**: Issue #42; `src/core/engine/AGENTS.md`
**Tests**: `js/host-choice.test.mjs`

#### Scenario: Case list

- **WHEN** a discretionary decision exists
- **THEN** its case id is in the closed list and the reason names the official
  discretion

### Requirement: Legal answer only

A discretionary information step SHALL accept only an answer that is one of the
offered options; any other answer SHALL be rejected and SHALL leave the step
incomplete.

**Source**: Issue #42; `docs/rules-matrix.md` `host-choice` rows
**Tests**: `js/host-choice.test.mjs`

#### Scenario: Illegal answer

- **WHEN** the host supplies an answer outside the offered options
- **THEN** the command is rejected with `error.66`, the options are returned and
  the step stays open

#### Scenario: Legal answer

- **WHEN** the host supplies one of the offered options
- **THEN** the step completes and one secret journal line records the case, the
  reason and the chosen value

### Requirement: Registration legality

A registration override SHALL be accepted only for the Spy or the Recluse and
only with a value their abilities read; any other player or value SHALL be
rejected before the step mutates.

**Source**: Issue #42; `docs/rules-matrix.md` Spy/Recluse registration row
**Tests**: `js/host-choice.test.mjs`

#### Scenario: Wrong player

- **WHEN** a registration names a player other than the Spy or the Recluse
- **THEN** the command is rejected with `error.67` and the state is unchanged

#### Scenario: Unread value

- **WHEN** a registration value is one the information functions never read
- **THEN** the command is rejected with `error.67`
