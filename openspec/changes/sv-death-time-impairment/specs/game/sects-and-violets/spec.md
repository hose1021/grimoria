# Spec Delta

## ADDED Requirements

### Requirement: A death-triggered ability uses the death-time impairment

The Sweetheart and Klutz abilities SHALL decide whether they worked from the
impairment recorded at the triggering death. A poison that expires later SHALL
NOT restore the ability.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Sweetheart r2704](https://wiki.bloodontheclocktower.com/index.php?title=Sweetheart&oldid=2704); [Klutz r1758](https://wiki.bloodontheclocktower.com/index.php?title=Klutz&oldid=1758); Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A poisoned Sweetheart recovers

- **WHEN** the Sweetheart dies poisoned and the poison expires before her step
- **THEN** no player becomes drunk

#### Scenario: A poisoned Klutz recovers

- **WHEN** the Klutz dies poisoned and the poison expires before the public
  choice resolves
- **THEN** an evil target does not lose the game for the Klutz's team

#### Scenario: A sober Sweetheart

- **WHEN** the Sweetheart dies sober and healthy
- **THEN** the chosen player becomes permanently drunk, as before
