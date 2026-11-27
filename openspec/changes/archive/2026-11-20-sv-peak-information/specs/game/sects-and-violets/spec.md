# Spec Delta

## ADDED Requirements

### Requirement: Day questions read the facts of the day

The Flowergirl SHALL answer from the voters who were Demons when the votes were
recorded. The Juggler SHALL answer from the CORRECT count fixed when the guesses
were recorded. A later character change SHALL NOT change either answer. A save
without the stored facts SHALL keep the previous computed answer.

**Source**: [Flowergirl r2907](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=2907) "Summary"; [Juggler r2401](https://wiki.bloodontheclocktower.com/index.php?title=Juggler&oldid=2401) "How to Run"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The Demon changes after voting

- **WHEN** the Demon votes and the Demon character moves to another seat before
  the Flowergirl wakes
- **THEN** the Flowergirl still learns that a Demon voted

#### Scenario: A seat becomes the Demon after the vote

- **WHEN** a player who voted as a Townsfolk becomes the Demon before the
  Flowergirl wakes
- **THEN** the Flowergirl does not count that vote

#### Scenario: The guessed seat changes character

- **WHEN** the Juggler guessed a character correctly and that seat changes
  before the Juggler wakes
- **THEN** the Juggler still learns the stored correct count
