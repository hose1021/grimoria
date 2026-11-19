# Spec Delta

## ADDED Requirements

### Requirement: A registered-dead player counts as dead in the day path

A player who registers as dead SHALL NOT nominate, and SHALL spend the vote
token on the first vote as any dead player does. The execution threshold is out
of scope of this requirement: it keeps the game's own living count until #313
settles the interpretation.

**Source**: [Zombuul r3022](https://wiki.bloodontheclocktower.com/index.php?title=Zombuul&oldid=3022) "Summary"; Issue #313
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The registered-dead Zombuul tries to nominate

- **WHEN** the Zombuul is alive but registered dead and nominates
- **THEN** the command is rejected with `error.11`

#### Scenario: The registered-dead Zombuul votes twice

- **WHEN** the registered-dead Zombuul votes on the first nomination of the day
- **THEN** the vote counts and the vote token is spent
- **AND** a vote on a later nomination that day is not counted
