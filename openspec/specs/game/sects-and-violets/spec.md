# Sects and Violets Specification

## Purpose

Defines the Sects and Violets behaviors the engine owns: official order and
composition, Evil Twin and Vortox win conditions, the Witch curse, Fang Gu
succession and No Dashii poison.

## Requirements

### Requirement: Official roster, order and composition

The engine SHALL use the official Sects and Violets roster, composition and
night order, SHALL apply the Fang Gu's plus one Outsider and the Vigormortis's
minus one Outsider, and SHALL reject an impossible shift.

**Source**: [Sects & Violets r3127](https://wiki.bloodontheclocktower.com/index.php?title=Sects_%26_Violets&oldid=3127), [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974), [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015)
**Tests**: `js/snv.test.mjs:59`, `js/snv.test.mjs:78`, `js/snv.test.mjs:86`, `js/snv.test.mjs:96`

#### Scenario: First night

- **WHEN** an Sects and Violets game starts
- **THEN** the first night follows the official order and validates

#### Scenario: Vigormortis without an Outsider

- **WHEN** the bag has no Outsider and the Vigormortis shift is selected
- **THEN** bag validation reports the impossible choice

### Requirement: Evil Twin setup and win

The engine SHALL require a good Evil Twin, SHALL give evil the win when the good
twin is executed, and SHALL keep good from winning while both twins live.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101)
**Tests**: `js/snv.test.mjs:119`, `js/snv.test.mjs:251`

#### Scenario: Good twin executed

- **WHEN** the good Evil Twin dies by execution
- **THEN** evil wins

#### Scenario: Missing good twin

- **WHEN** the setup has no good twin selected
- **THEN** setup validation reports the error

### Requirement: Vortox no-execution win

The engine SHALL give evil the win when the Vortox is in play and the day ends
without an execution event.

**Source**: [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017)
**Tests**: `js/snv.test.mjs:128`

#### Scenario: Day without execution

- **WHEN** the Vortox is in play and the host ends the day with no execution
- **THEN** evil wins

### Requirement: Witch curse

The engine SHALL curse the chosen player and kill that player when they
nominate on the following day while keeping the nomination, SHALL stop cursing
at three living players, and SHALL not curse when the Witch is dead or impaired.

**Source**: [Witch r2682](https://wiki.bloodontheclocktower.com/index.php?title=Witch&oldid=2682)
**Tests**: `js/snv.test.mjs:137`, `js/snv.test.mjs:162`

#### Scenario: Cursed nomination

- **WHEN** the cursed player nominates
- **THEN** the nominator dies and the nomination continues

#### Scenario: Impaired Witch

- **WHEN** the Witch is dead or poisoned at the night step
- **THEN** no curse is applied

### Requirement: Fang Gu succession

The engine SHALL let the first Outsider killed by the Fang Gu become an evil
Fang Gu while the old Demon dies, SHALL limit the jump to once per game, and
SHALL keep the limit through save, export, import, redeal and bag reset.

**Source**: [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974)
**Tests**: `js/snv.test.mjs:187`, `js/snv.test.mjs:269`, `js/snv.test.mjs:308`, `js/snv.test.mjs:327`, `js/snv.test.mjs:352`, `js/snv.test.mjs:376`, `js/snv.test.mjs:393`

#### Scenario: First Outsider death

- **WHEN** the Fang Gu kills an Outsider for the first time
- **THEN** that Outsider becomes an evil Fang Gu and the old Demon dies

#### Scenario: Second Outsider death

- **WHEN** the Fang Gu kills an Outsider after the jump already happened
- **THEN** the Outsider dies as normal

#### Scenario: Legacy save

- **WHEN** a save has the old per-player Fang Gu marker and no game-scoped flag
- **THEN** the once-per-game limit is still honored

### Requirement: No Dashii poison

The engine SHALL poison the nearest Townsfolk neighbours by character, including
dead seats, and SHALL reconcile the poison when the source or a target changes
character or the source loses the ability.

**Source**: [No Dashii r3158](https://wiki.bloodontheclocktower.com/index.php?title=No_Dashii&oldid=3158)
**Tests**: `js/snv.test.mjs:204`, `js/snv.test.mjs:217`

#### Scenario: Dead Townsfolk neighbour

- **WHEN** the nearest Townsfolk seat is dead
- **THEN** that player is still poisoned

### Requirement: Clockmaker information

The engine SHALL compute the shortest seat distance from the Demon to the
nearest Minion.

**Source**: [Clockmaker r2967](https://wiki.bloodontheclocktower.com/index.php?title=Clockmaker&oldid=2967)
**Tests**: `js/snv.test.mjs:110`

#### Scenario: Distance around the ring

- **WHEN** the Clockmaker wakes
- **THEN** the reported number is the shortest distance in either direction

### Requirement: Pit-Hag character change

The engine SHALL change the chosen player's character when the Pit-Hag chooses a
character that no player already holds, SHALL keep the player's alignment and
set the new shown character, SHALL keep the bluffs and the night queue
consistent, and SHALL reject a character already in play without changing the
state.

**Source**: [Pit-Hag r2998](https://wiki.bloodontheclocktower.com/index.php?title=Pit-Hag&oldid=2998)
**Tests**: `js/snv.test.mjs`

#### Scenario: New character

- **WHEN** the Pit-Hag chooses a player and a character that nobody holds
- **THEN** that player's character changes, their alignment stays the same, and
  the character leaves the bluffs

#### Scenario: Character in play

- **WHEN** the Pit-Hag chooses a character another player already holds
- **THEN** the command is rejected and the game state is unchanged

#### Scenario: No Demon remains

- **WHEN** the Pit-Hag changes the only living Demon into a non-Demon
- **THEN** good wins because no living Demon remains

### Requirement: Snake Charmer swap

The engine SHALL accept only a living target (a dead target is a typed
rejection with no swap), SHALL swap the chosen Demon's character and alignment
with the Snake Charmer, SHALL poison the new Snake Charmer permanently even
after the source dies or is impaired, and SHALL keep one Demon who wakes in the
Demon slot for the rest of that night.

**Source**: [Snake Charmer r2905](https://wiki.bloodontheclocktower.com/index.php?title=Snake_Charmer&oldid=2905)
**Tests**: `js/snv.test.mjs`

#### Scenario: Chosen living Demon

- **WHEN** the Snake Charmer chooses a living Demon
- **THEN** the two players exchange characters and alignments, the new Snake
  Charmer is poisoned permanently, and the new Demon wakes in the Demon slot

#### Scenario: Evil Snake Charmer

- **WHEN** the Snake Charmer is evil and chooses an evil Demon
- **THEN** both players stay evil after the swap

#### Scenario: Not a Demon or dead

- **WHEN** the Snake Charmer chooses a player who is not a living Demon
- **THEN** no character, alignment or poison changes

### Requirement: Barber swap

The engine SHALL swap the characters of the two players the Demon chooses after
the Barber died, SHALL keep both alignments, SHALL allow the choosing Demon to
swap itself, SHALL refuse another Demon, and SHALL keep the Evil Twin pair with
the same players so its win never moves to a character's new holder.

**Source**: [Barber r1757](https://wiki.bloodontheclocktower.com/index.php?title=Barber&oldid=1757)
**Tests**: `js/snv.test.mjs`

#### Scenario: Two players swap

- **WHEN** the Demon chooses two players after the Barber died
- **THEN** their characters are exchanged and both alignments stay the same

#### Scenario: Another Demon is chosen

- **WHEN** the Demon chooses a Demon other than the choosing Demon
- **THEN** the command is rejected and the game state is unchanged

#### Scenario: The Demon swaps itself

- **WHEN** the choosing Demon is one of the two chosen players
- **THEN** the swap is applied

### Requirement: Evil Twin pair after a character change

The engine SHALL keep the Evil Twin pair as the two stored players and SHALL
treat the current holder of the `eviltwin` character (either pair member) as the
ability holder. It SHALL award evil the win when the executed player is the
good-aligned pair member and the holder is alive and unimpaired at the
execution, SHALL stop the win and the both-live block without such a holder, and
SHALL backfill the pair once when importing an older save.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101)
**Tests**: `js/snv.test.mjs`

#### Scenario: A swap moves a twin's character

- **WHEN** a swap moves the good twin's or the Evil Twin's character to another
  player
- **THEN** the pair stays with the same players and executing the good-aligned
  twin still wins for evil, while executing the character's new holder does not

#### Scenario: The two twins swap characters

- **WHEN** a Barber swap exchanges the two twins' characters
- **THEN** the pair keeps both players, executing the good-aligned twin wins for
  evil, and both twins alive still block a good win

#### Scenario: Dead Evil Twin

- **WHEN** the Evil Twin is dead and the good twin is executed
- **THEN** evil does not win by the Evil Twin ability

#### Scenario: Evil Twin leaves play

- **WHEN** the Evil Twin character leaves play and the good twin is executed
- **THEN** evil does not win and the pair no longer blocks a good win

#### Scenario: Imported legacy save

- **WHEN** a save without the twin player ids is imported
- **THEN** the pair is resolved once from the roles before any character change

### Requirement: Philosopher borrowed ability

The engine SHALL store the good character the Philosopher chooses, SHALL make
the owner of that character drunk while it is in play, and SHALL give the
Philosopher that character's night step on the same and later nights, including
a death-triggered ability after the Philosopher dies.

**Source**: [Philosopher r2421](https://wiki.bloodontheclocktower.com/index.php?title=Philosopher&oldid=2421)
**Tests**: `js/snv.test.mjs`

#### Scenario: Character in play

- **WHEN** the Philosopher chooses a good character another player holds
- **THEN** that player is drunk and the Philosopher wakes with the borrowed
  ability

#### Scenario: Character enters play later

- **WHEN** the chosen character is not in play at the choice and enters play
  later
- **THEN** its new owner becomes drunk at that moment

#### Scenario: Philosopher dies or is impaired

- **WHEN** the Philosopher dies or becomes impaired after granting the drunk
- **THEN** the owner is sober again

#### Scenario: Impaired Philosopher

- **WHEN** the Philosopher is poisoned or drunk when choosing
- **THEN** the once-per-game ability is spent and no ability or drunk effect is
  granted

#### Scenario: Declined ability

- **WHEN** the Philosopher completes the step without a character
- **THEN** the once-per-game ability is not spent

#### Scenario: Regained character

- **WHEN** a player who spent the ability later gains the Philosopher character
  again
- **THEN** the once-per-game ability is available again

### Requirement: Replacement consistency

Every character replacement SHALL leave no duplicate character and no dangling
reference, SHALL be persisted by export and restored by import, SHALL keep the
current night's queue valid, and SHALL withdraw a borrowed Philosopher ability
when the Philosopher changes character.

**Source**: [Sects & Violets r3127](https://wiki.bloodontheclocktower.com/index.php?title=Sects_%26_Violets&oldid=3127)
**Tests**: `js/snv.test.mjs`

#### Scenario: Duplicate character

- **WHEN** any replacement would give two players the same character
- **THEN** the replacement is rejected and every character stays unique

#### Scenario: Export and import

- **WHEN** a game with a completed replacement is exported and imported
- **THEN** the character, the alignment, the previous character and the effects
  are restored and validate

#### Scenario: Night queue

- **WHEN** a replacement happens during the night
- **THEN** the changed player's unfinished old step is skipped and the new
  character's step exists only when its official slot is still ahead

#### Scenario: Former Philosopher

- **WHEN** a player with a borrowed Philosopher ability changes character
- **THEN** the borrowed marker and its drunk effect are withdrawn
