# Spec Delta

## MODIFIED Requirements

### Requirement: Pit-Hag character change

The engine SHALL change the chosen player's character when the Pit-Hag chooses a
character that no player already holds, SHALL keep the player's alignment and
set the new shown character, SHALL keep the bluffs and the night queue
consistent, SHALL queue the gained character's first-night step immediately
after the Pit-Hag step when the character starts knowing and the current night
has no step for it, and SHALL record "nothing happens" when the chosen
character is already in play without changing the state.

**Source**: [Pit-Hag r2998](https://wiki.bloodontheclocktower.com/index.php?title=Pit-Hag&oldid=2998), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: New character

- **WHEN** the Pit-Hag chooses a player and a character that nobody holds
- **THEN** that player's character changes, their alignment stays the same, and
  the character leaves the bluffs

#### Scenario: Start-knowing character created mid-game

- **WHEN** the Pit-Hag creates a start-knowing character on a night after the
  first
- **THEN** the new holder wakes immediately after the Pit-Hag step and learns
  its information, falsified when a living Vortox forbids the true answer

#### Scenario: Dead created character

- **WHEN** the Pit-Hag changes the character of a dead player
- **THEN** no step is queued for that player

#### Scenario: Character in play

- **WHEN** the Pit-Hag chooses a character another player already holds
- **THEN** the step completes with the nothing-happens reason and no player
  changes character

#### Scenario: No Demon remains

- **WHEN** the Pit-Hag changes the only living Demon into a non-Demon
- **THEN** good wins because no living Demon remains

### Requirement: Barber swap

The engine SHALL swap the characters of the two players the Demon chooses after
the Barber died, SHALL keep both alignments, SHALL allow the choosing Demon to
swap itself, SHALL refuse another Demon, SHALL queue the gained character's
first-night step for a player who becomes a start-knowing character, and SHALL
keep the Evil Twin pair with the same players so its win never moves to a
character's new holder.

**Source**: [Barber r1757](https://wiki.bloodontheclocktower.com/index.php?title=Barber&oldid=1757)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Two players swap

- **WHEN** the Demon chooses two players after the Barber died
- **THEN** their characters are exchanged and both alignments stay the same

#### Scenario: Start-knowing character gained by a swap

- **WHEN** a player becomes a start-knowing character through the swap
- **THEN** they gain the ability on that night, even if the original holder
  already used it

#### Scenario: Another Demon is chosen

- **WHEN** the Demon chooses a Demon other than the choosing Demon
- **THEN** the command is rejected and the game state is unchanged

#### Scenario: The Demon swaps itself

- **WHEN** the choosing Demon is one of the two chosen players
- **THEN** the swap is applied
