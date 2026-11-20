# Spec Delta

## ADDED Requirements

### Requirement: Borrowed abilities resolve their holder

A day or command action that belongs to a borrowed ability SHALL resolve the
holder through the effective ability, not the printed role alone. Every Savant
holder SHALL be able to visit once per day. The Mathematician's own character
SHALL NOT be markable as an abnormal working.

**Source**: [Philosopher r2421](https://wiki.bloodontheclocktower.com/index.php?title=Philosopher&oldid=2421) "Summary", "Tips and Tricks"; [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153) "Summary"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A borrowed Juggler guesses

- **WHEN** a living Philosopher holds the borrowed Juggler ability on a day
- **THEN** `jugglerGuess` records the guesses and the CORRECT count

#### Scenario: A borrowed Klutz chooses

- **WHEN** a dead Philosopher holds the borrowed Klutz ability
- **THEN** `recordKlutzChoice` records the public choice

#### Scenario: Two Savants visit

- **WHEN** a real Savant and a borrowed Savant both visit on one day
- **THEN** both visits are accepted and both are kept in `savantVisits`

#### Scenario: The Mathematician is marked

- **WHEN** the Storyteller marks the Mathematician's own character
- **THEN** the command is rejected with `error.mathematician-self`
