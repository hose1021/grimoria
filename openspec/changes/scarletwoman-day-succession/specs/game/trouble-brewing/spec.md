# Spec Delta

## ADDED Requirements

### Requirement: A daytime Demon succession still wakes the new Demon

When a Demon dies during the day and a successor takes the role, the next night
queue SHALL contain the `demonchange` step that wakes the new Demon and shows
the YOU ARE token. The obligation SHALL survive the day-to-night reset and a
reload before that night.

**Source**: [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117) "How to Run"; [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116) "How to Run"; Issue #217
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The Demon is executed

- **WHEN** the Demon is executed with five or more players alive and a sober
  Scarlet Woman becomes the Demon
- **THEN** ending the day builds the next night with a `demonchange` step

#### Scenario: The wake-up step completes

- **WHEN** the Storyteller completes the `demonchange` step
- **THEN** the step is marked done and the night continues

#### Scenario: A night self-kill keeps its existing wake-up

- **WHEN** the Demon kills themself at night and a Minion inherits
- **THEN** the same night keeps the `demonchange` step, as before
