# Spec Delta

## ADDED Requirements

### Requirement: The Pit-Hag offers arbitrary deaths only after creating a Demon

The Pit-Hag step SHALL NOT offer a Storyteller control for a recorded death
before the chosen character creates a Demon. The completion SHALL gain that
control only when the new character is a Demon, and the outcome path SHALL
reject a recorded death on a step that does not allow one.

**Source**: [Pit-Hag r2998](https://wiki.bloodontheclocktower.com/index.php?title=Pit-Hag&oldid=2998); Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A fresh step records no death

- **WHEN** the Pit-Hag's step is built and the Storyteller records a death
  before choosing a character
- **THEN** the outcome is rejected and the named player stays alive

#### Scenario: A no-op choice records no death

- **WHEN** the Pit-Hag chooses a character already in play
- **THEN** the step still offers no death and a recorded death is rejected

#### Scenario: A created Demon opens the arbitrary deaths

- **WHEN** the Pit-Hag turns a player into a Demon
- **THEN** the step accepts the deaths the Storyteller marks as Pit-Hag attacks

#### Scenario: An earlier recorded death replays

- **WHEN** a command recorded under the earlier ruleset marks a Pit-Hag death
- **THEN** the replay keeps that death
