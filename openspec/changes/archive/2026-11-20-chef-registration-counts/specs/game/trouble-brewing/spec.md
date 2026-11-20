# Spec Delta

## ADDED Requirements

### Requirement: The Chef offers every registration-consistent count

The Chef information step SHALL require a Storyteller answer when a sober,
healthy Spy or Recluse can change the number of adjacent evil pairs, and SHALL
offer every count the pinned registration rule permits for that query. The
engine SHALL NOT choose a registration on the Storyteller's behalf.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510) "Examples"; [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007) "Summary"; Issue #217
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A Recluse registers differently for each adjacent pair

- **WHEN** a Recluse sits between two evil players and the Chef wakes
- **THEN** the step offers 0, 1 and 2, requires an answer, and accepts 1

#### Scenario: A count outside every registration is rejected

- **WHEN** the Chef step offers 0, 1 and 2 and the host answers 3
- **THEN** the completion is rejected and the step stays open

#### Scenario: No registrant means no answer

- **WHEN** no sober, healthy Spy or Recluse can change the count
- **THEN** the step reports the computed count and requires no answer

#### Scenario: An impaired Chef keeps the false range

- **WHEN** the Chef is drunk or poisoned
- **THEN** any count from 0 to the player count is offered, as before
