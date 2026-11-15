# Spec Delta

## ADDED Requirements

### Requirement: Lunatic night-one bluff card

The Lunatic's night-one card SHALL mirror the Demon's night-one card: the
Lunatic's own seat as the Demon they believe they are, the Minion players and
the bluffs. The Storyteller SHALL choose the Minion players and the app SHALL
NOT fill them in automatically. First-night picks SHALL NOT be recorded or
reported as an attack. The card SHALL NOT name the real Demon's player or the
real Minions.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112), [Issue #187](https://github.com/hose1021/grimoria/issues/187)
**Tests**: `src/core/engine/bmr.test.ts`, `scripts/browser-check.mjs`

#### Scenario: Chosen Minions

- **WHEN** the host shows the Lunatic's night-one card after picking one player
  per Minion in play
- **THEN** the card uses the Demon card layout with the Lunatic's own seat and
  the picked players, plus the three bluffs

#### Scenario: No real Demon or real Minions

- **WHEN** the Lunatic's card is shown
- **THEN** it names neither the real Demon's player nor the real Minions

#### Scenario: First night is not an attack

- **WHEN** the first-night Lunatic step completes with the Minion picks
- **THEN** no death is recorded, no attack target is stored for later nights
  and the Demon's report does not name the picks

#### Scenario: Wrong number of Minions

- **WHEN** the host confirms the first-night Lunatic step without exactly one
  pick per Minion in play
- **THEN** the engine rejects the step
