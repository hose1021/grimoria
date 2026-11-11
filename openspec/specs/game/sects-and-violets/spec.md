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
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Day without execution

- **WHEN** the Vortox is in play and the host ends the day with no execution
- **THEN** evil wins

### Requirement: Witch curse

The engine SHALL curse the chosen player and kill that player when they
nominate on the following day while keeping the nomination, SHALL stop cursing
at three living players, and SHALL not curse when the Witch is dead or impaired.

**Source**: [Witch r2682](https://wiki.bloodontheclocktower.com/index.php?title=Witch&oldid=2682)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Dead Townsfolk neighbour

- **WHEN** the nearest Townsfolk seat is dead
- **THEN** that player is still poisoned

### Requirement: Clockmaker information

The engine SHALL compute the shortest seat distance from the Demon to the
nearest Minion.

**Source**: [Clockmaker r2967](https://wiki.bloodontheclocktower.com/index.php?title=Clockmaker&oldid=2967)
**Tests**: `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`

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
**Tests**: `src/core/engine/snv.test.ts`

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

### Requirement: Vigormortis minion behaviour

The engine SHALL let a Minion killed by the Vigormortis keep its ability while
a living, unimpaired Vigormortis exists, SHALL stop the retention when the
Vigormortis dies or is impaired, SHALL poison one Townsfolk neighbour of the
killed Minion, and SHALL let the host name that neighbour.

**Source**: [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015), `docs/official/roles.json`
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Killed Minion keeps its ability

- **WHEN** the Vigormortis kills a Minion and remains alive and unimpaired
- **THEN** the dead Minion still has its night step and may act

#### Scenario: The Vigormortis leaves play

- **WHEN** the Vigormortis dies or is impaired after killing a Minion
- **THEN** the dead Minion no longer has a step and no longer poisons a
  neighbour

#### Scenario: Townsfolk neighbour poisoned

- **WHEN** the Vigormortis kills a Minion with a Townsfolk neighbour
- **THEN** one Townsfolk neighbour is poisoned and the host may name the other
  legal Townsfolk neighbour instead

#### Scenario: Retained Evil Twin

- **WHEN** the Vigormortis kills the Evil Twin and the good twin is then executed
- **THEN** evil wins by the Evil Twin ability while the Vigormortis lives and is
  unimpaired

#### Scenario: The source leaves the Minion team

- **WHEN** the killed Minion changes character to a non-Minion
- **THEN** its poison ends

### Requirement: Vortox false information

The engine SHALL compute a Townsfolk information answer that is true only when
the actor is unimpaired and no living, unimpaired Vortox is in play, and
otherwise SHALL require the host to supply the answer.

**Source**: [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017), `docs/official/roles.json`
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Vortox in play

- **WHEN** a Townsfolk information step is completed while a living, unimpaired
  Vortox is in play
- **THEN** the step requires a host-supplied answer and refuses to complete
  without one

#### Scenario: Impaired actor

- **WHEN** the information role is poisoned or drunk
- **THEN** the step requires a host-supplied answer

#### Scenario: Neither

- **WHEN** the actor is unimpaired and no Vortox ability is in play
- **THEN** the computed answer is stored and the step completes without a host
  answer

### Requirement: Computed Sects and Violets information

The engine SHALL compute the Oracle count of dead evil players, the Seamstress
same-alignment answer for two distinct players other than herself, the
Flowergirl's "a Demon voted today", the Town Crier's "a Minion nominated today",
and the Juggler's correct-guess count, SHALL enforce the Dreamer's "not
yourself" target rule, and SHALL spend the Seamstress ability once per game.

**Source**: `docs/official/roles.json` ([Oracle r2909](https://wiki.bloodontheclocktower.com/index.php?title=Oracle&oldid=2909), [Seamstress r1999](https://wiki.bloodontheclocktower.com/index.php?title=Seamstress&oldid=1999), [Flowergirl r2907](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=2907), [Town Crier r3145](https://wiki.bloodontheclocktower.com/index.php?title=Town_Crier&oldid=3145), [Juggler r2401](https://wiki.bloodontheclocktower.com/index.php?title=Juggler&oldid=2401), [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904))
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Oracle count

- **WHEN** the Oracle wakes after dead players include evil players
- **THEN** the answer is the number of dead evil players

#### Scenario: Seamstress alignment

- **WHEN** the Seamstress chooses two players
- **THEN** the answer is whether they share an alignment and the ability is
  spent

#### Scenario: Flowergirl and Town Crier

- **WHEN** the ended day had a Demon vote or a Minion nomination
- **THEN** the corresponding yes/no answer is true, and false otherwise

#### Scenario: Dreamer target

- **WHEN** the Dreamer chooses themself
- **THEN** the step is rejected and nothing changes

### Requirement: Juggler first-day guesses

The engine SHALL record up to five Juggler character guesses on the first day
through a dedicated day command, SHALL create the Juggler night step only after
guesses are recorded, and SHALL answer with the count of guesses that match the
players' characters.

**Source**: [Juggler r2401](https://wiki.bloodontheclocktower.com/index.php?title=Juggler&oldid=2401), `docs/official/roles.json`
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Guesses recorded

- **WHEN** the host records guesses for players on the first day
- **THEN** the Juggler's night step exists and its answer is the number of
  matching characters

#### Scenario: No guesses

- **WHEN** the first day ends without a recorded guess
- **THEN** the Juggler has no night step

#### Scenario: Limit and timing

- **WHEN** a sixth guess or a guess on a later day is attempted
- **THEN** the command is rejected and the state is unchanged

### Requirement: Klutz death choice

The engine SHALL append a Klutz step when the Klutz dies, SHALL require one
living player as the public choice, and SHALL make the Klutz's team lose in the
engine's win check when that player is evil. A drunk or poisoned Klutz SHALL
spend the choice without deciding the game.

**Source**: [Klutz r1758](https://wiki.bloodontheclocktower.com/index.php?title=Klutz&oldid=1758), `docs/official/roles.json`
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Evil target

- **WHEN** the dead Klutz chooses a living evil player
- **THEN** the Klutz's team loses with reason `klutz` and the opposing team wins

#### Scenario: Impaired Klutz

- **WHEN** a drunk or poisoned Klutz chooses an evil player
- **THEN** the choice is spent, no winner is declared, and the step note states the ability failed

#### Scenario: Non-evil target

- **WHEN** the dead Klutz chooses a living player who is not evil
- **THEN** no winner is declared

#### Scenario: Evil Klutz

- **WHEN** an evil-aligned Klutz chooses a living evil player
- **THEN** evil loses and good wins with reason `klutz`

#### Scenario: Dead target

- **WHEN** the Klutz chooses a dead player
- **THEN** the step is rejected and the state is unchanged

### Requirement: Sage and Sweetheart death triggers

The engine SHALL append the Sage information step only when the Demon killed
the Sage, and SHALL apply a permanent drunk to the player the Sweetheart
chooses when the Sweetheart dies.

**Source**: [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009), [Sweetheart r2704](https://wiki.bloodontheclocktower.com/index.php?title=Sweetheart&oldid=2704), `docs/official/roles.json`
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Sage killed by the Demon

- **WHEN** the Demon kills the Sage
- **THEN** the Sage information step exists for the host to show two players

#### Scenario: Sage killed another way

- **WHEN** the Sage dies without a Demon kill
- **THEN** no Sage information step is appended

#### Scenario: Sweetheart death

- **WHEN** the dead Sweetheart chooses a player
- **THEN** that player is drunk permanently

### Requirement: Madness state

The engine SHALL store madness as an effect with a source (`cerenovus` or
`mutant`), the mad player, the character the player must be mad about (or the
Outsider requirement for the Mutant), and an expiry, SHALL create one Cerenovus
token for the chosen player and good character at that night step, SHALL keep it
active through the following day, SHALL end it at the next night, and SHALL
allow the Storyteller to remove it explicitly.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Chosen player and character

- **WHEN** the Cerenovus step completes with a target and a good character from
  the script
- **THEN** the state stores a madness token with the Cerenovus player as its
  source, the chosen player as its target and the chosen character

#### Scenario: The madness day

- **WHEN** the Cerenovus token is created on night 1
- **THEN** it is active during day 1 and inactive from night 2 onward

#### Scenario: Missing or illegal character

- **WHEN** the Cerenovus step completes without a good character, or with one
  outside the script
- **THEN** no madness token is created and the step keeps its host note

#### Scenario: Explicit removal

- **WHEN** the Storyteller removes the madness effect
- **THEN** the player is no longer under active madness

### Requirement: Storyteller madness penalty

The engine SHALL apply the madness penalty only through the `madnessPenalty`
command, SHALL accept only the legal penalties `execute` and `none`, SHALL
require a non-empty Storyteller reason, SHALL record and explain the decision
without automating it, SHALL execute the mad player through the normal day
execution path with the `madness` cause when the Storyteller chooses `execute`,
SHALL keep the state unchanged otherwise, and SHALL reject a second decision for
the same token on the same day.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048), [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Execution penalty

- **WHEN** the host applies `madnessPenalty` with `execute` and a reason
- **THEN** the mad player is executed for this day, the execution cause is
  `madness`, and the token stores the decision and its reason

#### Scenario: Declined penalty

- **WHEN** the host applies `madnessPenalty` with `none` and a reason
- **THEN** nobody dies, the token stores the decision and its reason, and the
  day continues

#### Scenario: Illegal penalty

- **WHEN** the penalty is not one of the legal options
- **THEN** the command returns a Storyteller choice with `execute` and `none`
  and the state is unchanged

#### Scenario: No active madness or no reason

- **WHEN** the player has no active madness or the reason is empty
- **THEN** the command is rejected and the state is unchanged

### Requirement: Mutant madness

The engine SHALL keep a standing madness token for every living Mutant that
requires the Mutant to be mad about being an Outsider, SHALL create it when the
Mutant enters play through a deal or a character change, SHALL end it when the
player dies or stops being the Mutant, and SHALL use the same Storyteller
penalty command.

**Source**: [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The Mutant in play

- **WHEN** an Sects and Violets game with a living Mutant builds its first night
- **THEN** a madness token exists with the Mutant as both source and target and
  no character requirement beyond the Outsider one

#### Scenario: Character change

- **WHEN** the Mutant stops being the Mutant
- **THEN** the token is no longer active

#### Scenario: Penalty on the Mutant

- **WHEN** the host applies `madnessPenalty` to the living Mutant
- **THEN** the decision is recorded and executed exactly as for the Cerenovus

### Requirement: Madness stays out of public views

The engine SHALL keep madness data out of `publicGameView`, SHALL keep it out of
the public role view and the player handoff projection, and SHALL expose it only
to the host through the state and its secret log.

**Source**: `openspec/specs/app/ui-and-privacy/spec.md` "Public and player privacy", `openspec/specs/app/store-boundaries/spec.md` "Read models are projections"
**Tests**: `src/core/engine/snv.test.ts`, `src/ui/screens/player-projection.test.ts`

#### Scenario: Public projection

- **WHEN** a game holds an active madness token
- **THEN** the serialized public game view contains no madness source, required
  character or target

#### Scenario: Player handoff

- **WHEN** the player handoff projects a seat
- **THEN** it exposes only the seat, name, claim state and shown role
