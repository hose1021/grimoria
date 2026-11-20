# Sects and Violets Specification

## Purpose

Defines the Sects and Violets behaviors the engine owns: official order and
composition, Evil Twin and Vortox win conditions, the Witch curse, Fang Gu
succession and No Dashii poison.

## Requirements

### Requirement: Official roster, order and composition

The engine SHALL use the official Sects and Violets roster, composition and
night order, SHALL apply the Fang Gu's plus one Outsider and the Vigormortis's
minus one Outsider, SHALL NOT change the composition when the Vigormortis has no
Outsider token to remove, and SHALL never accept a negative team count.

**Source**: [Sects & Violets r3127](https://wiki.bloodontheclocktower.com/index.php?title=Sects_%26_Violets&oldid=3127), [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974), [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/setup.test.ts`

#### Scenario: First night

- **WHEN** an Sects and Violets game starts
- **THEN** the first night follows the official order and validates

#### Scenario: Vigormortis without an Outsider

- **WHEN** the bag has no Outsider token to remove and the Vigormortis is in play
- **THEN** the composition is the base one, the bag is legal and no
  `vigormortis-minus` reason is reported

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

The engine SHALL place a curse only when the Witch's ability works and SHALL
kill the cursed player on their next day's nomination while the curse
is active, keeping the nomination. Death or impairment of the Witch SHALL
disable the curse, even when a dead Witch retains its ability through an active
Vigormortis. Temporary impairment SHALL suspend rather than remove it,
so recovery during its duration restores it. With three or fewer living
players, a placed curse SHALL NOT kill.

**Source**: [Witch r2682](https://wiki.bloodontheclocktower.com/index.php?title=Witch&oldid=2682), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015)
**Tests**: `src/core/engine/snv.test.ts` "official Witch curse stops while its source is dead, drunk or poisoned"; `src/core/engine/snv.test.ts` "official Witch curse resumes when the Witch becomes healthy before nomination"

#### Scenario: Cursed nomination

- **WHEN** the cursed player nominates while the Witch's curse is active
- **THEN** the nominator dies and the nomination continues

#### Scenario: Impaired Witch

- **WHEN** the Witch is dead or poisoned at her own night step
- **THEN** no curse is placed

#### Scenario: Witch dies or is impaired after casting

- **WHEN** the Witch placed a curse and then died without retained ability or became impaired
- **THEN** the cursed player's nomination does not kill them while that condition holds

#### Scenario: Three living players

- **WHEN** exactly three players live
- **THEN** the Witch has no ability and the curse no longer kills

#### Scenario: Recovery before nomination

- **WHEN** the Witch becomes healthy again before the cursed player's nomination and the curse has not expired
- **THEN** that nomination triggers the curse

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
set the new shown character, SHALL keep bluffs and night queue consistent,
SHALL queue the gained character's first-night step immediately after the
Pit-Hag step when it starts knowing and that night has no step for it, and
SHALL record "nothing happens" when the chosen character is already in play,
without changing state.

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

### Requirement: Evil Twin pair after a character change

The engine SHALL keep the Evil Twin pair as the two players the Storyteller
chose, SHALL NOT infer an opposing player, SHALL leave both player ids unset
when a character gained mid-game makes a player the `eviltwin` holder, and
SHALL treat either current `eviltwin` holder as the ability holder. It SHALL
award evil the win when the executed player is the good-aligned pair member and
the holder is alive and unimpaired, and SHALL keep the both-live block only for
a chosen pair.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/evil-twin-choice.test.ts`

#### Scenario: A Pit-Hag-created Evil Twin

- **WHEN** the Pit-Hag creates an Evil Twin
- **THEN** the pair stays unset until the host records the partner with the
  `twin` correction, and the night cannot end before that correction

#### Scenario: A swap moves a twin's character

- **WHEN** a swap moves the good twin's or the Evil Twin's character to another
  player
- **THEN** the pair stays with the same players and executing the good-aligned
  twin still wins for evil

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

#### Scenario: No chosen pair

- **WHEN** a living `eviltwin` holder has no chosen pair
- **THEN** `endNight` is rejected with `error.77`

#### Scenario: Imported legacy save

- **WHEN** a save without the twin player ids is imported
- **THEN** the pair is resolved once from the roles before any character change,
  while a save with explicit null ids stays unchosen

### Requirement: Philosopher borrowed ability

The engine SHALL store the good character the Philosopher chooses, SHALL make
the owner of that character drunk while it is in play, SHALL give the
Philosopher that character's night step on the same and later nights, including
each death-triggered ability the borrowed character has after the Philosopher
dies, and SHALL use the borrowed ability in place of the printed character for
that character's day ability. A Drunk's shown character SHALL NOT trigger a
hidden consequence.

**Source**: [Philosopher r2421](https://wiki.bloodontheclocktower.com/index.php?title=Philosopher&oldid=2421), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/roles/moonchild/role.test.ts`

#### Scenario: Character in play

- **WHEN** the Philosopher chooses a good character another player holds
- **THEN** that player is drunk and the Philosopher wakes with the borrowed
  ability

#### Scenario: Character enters play later

- **WHEN** the chosen character is not in play at the choice and enters play
  later
- **THEN** its new owner becomes drunk at that moment

#### Scenario: Borrowed day ability

- **WHEN** the borrowed character has a day ability and the Philosopher uses it
- **THEN** the borrowed Slayer may shoot, the borrowed Tinker may die by the
  ability, and the borrowed Virgin triggers on a Townsfolk nomination

#### Scenario: Drunk shown a day ability

- **WHEN** a Drunk's shown character has a day ability
- **THEN** the Drunk may publicly attempt the Slayer shot with no death, and the
  shown Tinker, Virgin or Moonchild produces no hidden consequence or step

#### Scenario: Philosopher dies or is impaired

- **WHEN** the Philosopher dies or becomes impaired after granting the drunk
- **THEN** the owner is sober again

#### Scenario: Borrowed death-triggered ability

- **WHEN** the Philosopher borrowed the Klutz, the Sweetheart, the Sage or the
  Barber and the Philosopher dies in the way that triggers it
- **THEN** the borrowed ability wakes and resolves under the Philosopher's name

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
active through the following day and the night after it, SHALL end it at the
next dawn, and SHALL allow the Storyteller to remove it explicitly.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Chosen player and character

- **WHEN** the Cerenovus step completes with a target and a good character from
  the script
- **THEN** the state stores a madness token with the Cerenovus player as its
  source, the chosen player as its target and the chosen character

#### Scenario: The madness day

- **WHEN** the Cerenovus token is created on night 1
- **THEN** it is active during day 1 and night 2, and inactive from day 2
  onward

#### Scenario: Missing or illegal character

- **WHEN** the Cerenovus step completes without a good character, or with one
  outside the script
- **THEN** no madness token is created and the step keeps its host note

#### Scenario: Explicit removal

- **WHEN** the Storyteller removes the madness effect
- **THEN** the player is no longer under active madness

### Requirement: Storyteller madness penalty

The engine SHALL apply a madness penalty only through a recorded Storyteller
decision that names one of the legal penalties `execute` or `none` and a
non-empty reason. A recorded `none` decision MAY be upgraded once to `execute`
later that day while no execution has occurred; the engine SHALL reject any
other repeated decision and any downgrade of an execution. The engine SHALL not
decide whether a player broke madness.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048), [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039)
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

#### Scenario: A player has overlapping madness conditions

- **WHEN** the host reviews a player affected by both Mutant and Cerenovus madness
- **THEN** each `madnessPenalty` names its madness effect ID, records a separate
  decision and reason, and ending the day stays blocked until both are reviewed

#### Scenario: End of day requires madness review

- **WHEN** the Storyteller ends a day with an active Cerenovus or Mutant madness effect that has no decision for that day
- **THEN** the command is rejected without changing state and identifies the player whose madness needs review

#### Scenario: No penalty is recorded after review

- **WHEN** the Storyteller records `none` with a reason for each active madness effect
- **THEN** the day may end and the journal records the decisions

#### Scenario: New evidence changes the decision

- **WHEN** the Storyteller recorded `none` and later chooses `execute` for that same active madness effect before another execution
- **THEN** the execution is recorded through the normal path and the day ends

#### Scenario: Execution decision cannot be repeated or reversed

- **WHEN** the madness effect already caused an execution or the day already has an execution
- **THEN** another execution decision is rejected without changing state

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

### Requirement: Klutz public choice

The engine SHALL record the Klutz's public choice at the moment the Klutz learns
of the death: an evil target SHALL lose the game immediately for the Klutz's
team, a good target SHALL not, an impaired Klutz SHALL spend the choice and lose
nothing, and a target who is not alive when the choice is made SHALL be refused
with a typed reason so the host can name another living player. A choice
already recorded SHALL complete the death-triggered step even if its target dies
beforewards.

**Source**: [Klutz r1758](https://wiki.bloodontheclocktower.com/index.php?title=Klutz&oldid=1758)
**Tests**: `src/core/engine/snv.test.ts`, `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: Evil target at the death

- **WHEN** an executed Klutz publicly chooses an evil player
- **THEN** the opposing team wins immediately with the `klutz` reason

#### Scenario: Choice after an execution

- **WHEN** the day execution killed the Klutz and ended the day
- **THEN** the day-help sheet still offers the Klutz form and the panel records
  one living player through the command

#### Scenario: Target already dead

- **WHEN** the host tries to record a target who is not alive
- **THEN** the choice is refused with `error.55` and another living player can be
  recorded, so the step is never stranded

#### Scenario: Recorded choice and the queued step

- **WHEN** a choice is recorded while a Klutz step is still queued
- **THEN** that step is completed with the recorded target

### Requirement: Pit-Hag created Demon

The engine SHALL NOT give a Demon created by the Pit-Hag the normal Demon wake,
SHALL let the host record the night's arbitrary deaths on the Pit-Hag step, and
SHALL NOT tag those deaths as Demon attacks, so a Demon-only death trigger does
not fire.

**Source**: [Pit-Hag r2998](https://wiki.bloodontheclocktower.com/index.php?title=Pit-Hag&oldid=2998), [Sage r3049](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3049)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A Demon is made

- **WHEN** the Pit-Hag creates a Demon
- **THEN** no Demon step is queued for that player that night and the Pit-Hag
  step accepts death records

#### Scenario: Arbitrary deaths and the Sage

- **WHEN** the host records a death on the Pit-Hag step and the Sage dies
- **THEN** the death is not a Demon attack and the Sage gets no information step

### Requirement: False information for computed Townsfolk answers

Every computed Townsfolk information step SHALL report whether its actor is
impaired and SHALL require a host answer when the actor is impaired or a living,
unimpaired Vortox is in play, so the Dreamer, the Sage and the Mathematician
behave like the Clockmaker, the Oracle, the Seamstress, the Flowergirl, the Town
Crier and the Juggler.

**Source**: [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017), [Dreamer r3096](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=3096), [Sage r3049](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3049), [Mathematician r3100](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3100)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Vortox in play

- **WHEN** a living, unimpaired Vortox is in play at the Dreamer, Sage or
  Mathematician step
- **THEN** the step reports `needsChoice` and refuses to complete without a host
  answer

#### Scenario: Healthy actor, no Vortox

- **WHEN** the actor is healthy and no Vortox is in play
- **THEN** the step completes with the computed answer and no host choice

### Requirement: Vigormortis retention and impairment

The engine SHALL keep a Minion killed by the Vigormortis able to use its
character only while that Minion is sober and healthy, SHALL stop its neighbour
poison while it is impaired, and SHALL restore both when it is sober and healthy
again. A permanent poison SHALL NOT ignore its source's impairment.

**Source**: [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The dead Minion becomes drunk

- **WHEN** a Minion killed by the Vigormortis is drunk or poisoned
- **THEN** it loses the retained ability and its neighbour is no longer poisoned

#### Scenario: Sober again

- **WHEN** the impairment ends
- **THEN** the retained ability and the neighbour poison return

### Requirement: Sweetheart drunk timing

The Sweetheart's drunk SHALL start at the Sweetheart's death rather than at the
bookkeeping step's night slot, because the printed ability starts "from now on".

**Source**: [Sweetheart r3016](https://wiki.bloodontheclocktower.com/index.php?title=Sweetheart&oldid=3016)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Executed Sweetheart

- **WHEN** the Sweetheart is executed during a day and the host records the
  drunk choice that night
- **THEN** the stored effect starts at the day of the death

### Requirement: Juggler guesses

The Juggler SHALL make zero to five guesses, SHALL allow the same player to be
guessed more than once with different characters, SHALL count every guess
separately, SHALL wake with zero guesses and learn zero, and SHALL treat "your
1st day" as the day the guesses were made rather than day one of the game.

**Source**: [Juggler r3020](https://wiki.bloodontheclocktower.com/index.php?title=Juggler&oldid=3020)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Zero guesses

- **WHEN** the Juggler made no guesses on their first day
- **THEN** the night step exists and the computed answer is zero

#### Scenario: Repeated player

- **WHEN** the guesses name the same player twice with different characters
- **THEN** both guesses count toward the answer

#### Scenario: A later first day

- **WHEN** the guesses were recorded on a day other than day one
- **THEN** the step is built for the night after that day, and guesses from an
  earlier day do not repeat the step

### Requirement: Madness execution timing

A madness penalty of execution SHALL be recordable during the day or the night,
and a madness execution SHALL not be blocked by, and SHALL not consume, the
day's own execution. A Cerenovus token SHALL be executable during the mad day
and the night that follows it; a token told on the current night SHALL NOT be
executable that night because the player has not had the mad day.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048), [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Broken madness at night

- **WHEN** the host records an execution penalty for a mad player during the
  night
- **THEN** the command is allowed and the player dies

#### Scenario: Cerenovus execution on the following night

- **WHEN** a Cerenovus token was told on night 1 and the host records an
  execution penalty on night 2
- **THEN** the command is allowed and the target dies

#### Scenario: Cerenovus told on the current night

- **WHEN** the Cerenovus token is created on the current night and the host
  tries to execute the target that same night
- **THEN** the command is rejected with `error.73` and the target stays alive

#### Scenario: Mutant first night

- **WHEN** a living Mutant has its standing madness on night 1 and the host
  records an execution penalty
- **THEN** the command is allowed and the Mutant dies

### Requirement: Vote-dependent information without a ledger

The Flowergirl and the Town Crier SHALL require a host answer when no ended day
with a recorded nomination ledger exists, because ordinary nominations and votes
are run at the table, and SHALL use the computed answer only when such a ledger
exists.

**Source**: [Flowergirl r3009](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=3009), [Town Crier r3182](https://wiki.bloodontheclocktower.com/index.php?title=Town_Crier&oldid=3182), `docs/rules-sources.md` "Known limitations"
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: No ledger

- **WHEN** the previous day has no recorded nominations
- **THEN** the step reports `needsChoice` and refuses to complete without the
  host's yes or no

#### Scenario: Recorded ledger

- **WHEN** the previous day recorded a Demon vote or a Minion nomination
- **THEN** the step answers from the ledger

### Requirement: Artist private question

The engine SHALL record one Artist question per game through the
`artistQuestion` command, only during an unended day, only for a living player
whose effective character is the Artist or who holds the Artist through the
Philosopher, with a non-empty trimmed question and one answer from `yes`, `no`
or `unknown`, and SHALL NOT interpret the question or compute the answer.

**Source**: [Artist r3156](https://wiki.bloodontheclocktower.com/index.php?title=Artist&oldid=3156); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`, `src/application/read-models/table.test.ts`

#### Scenario: First and only question

- **WHEN** a living Artist asks a question during the day
- **THEN** the engine stores the trimmed question, the chosen answer and
  `used.artist`, and the ability is not offered again

#### Scenario: Declined or invalid use

- **WHEN** the question is blank, the player does not hold the Artist ability,
  or the Artist has already asked
- **THEN** the command is rejected and no state changes

#### Scenario: Private answer

- **WHEN** the question and answer are stored
- **THEN** the public projection contains neither, and replay from the journal
  restores the same private record

### Requirement: Savant private statements

The engine SHALL record one Savant visit per day through the `savantVisit`
command, only during an unended day and only for a living player whose effective
character is the Savant or who holds the Savant through the Philosopher, with
two different non-empty trimmed statements and a declared truth pattern. A
healthy Savant with no living unimpaired Vortox SHALL be required to declare
exactly one true statement. The engine SHALL NOT verify whether a statement is
true.

**Source**: [Savant r2910](https://wiki.bloodontheclocktower.com/index.php?title=Savant&oldid=2910); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`, `src/application/read-models/table.test.ts`

#### Scenario: One true statement

- **WHEN** a healthy Savant hears two statements and no living unimpaired
  Vortox is in play
- **THEN** the host must declare the first or the second statement true

#### Scenario: Frequency and privacy

- **WHEN** the Savant visits twice on the same day, or the visit is recorded
- **THEN** the second visit is rejected, and the statements stay out of the
  public projection while remaining replayable

### Requirement: Savant impaired and Vortox patterns

While the Savant is impaired the engine SHALL permit one, both or neither
statement to be true. Under a living unimpaired Vortox the engine SHALL permit
only both statements false, because Townsfolk information is false.

**Source**: [Savant r2910](https://wiki.bloodontheclocktower.com/index.php?title=Savant&oldid=2910), [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017)
**Tests**: `src/core/engine/snv.test.ts`, `src/application/read-models/table.test.ts`

#### Scenario: Impaired Savant

- **WHEN** the Savant is drunk or poisoned
- **THEN** the host may declare one, both or neither statement true

#### Scenario: Vortox

- **WHEN** a living unimpaired Vortox is in play
- **THEN** only both statements false is accepted

### Requirement: Abnormal ability marking

The engine SHALL record one ABNORMAL mark per character in the current day and
night through the `recordAbnormal` command, with a required non-empty reason,
only for a living game and a real player. It SHALL reject a second mark for the
same player in the same day and night, and SHALL NOT infer that an ability was
abnormal.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Mark and duplicate

- **WHEN** the Storyteller marks a character whose ability worked abnormally
- **THEN** the mark stores the player, the reason and the time, and a second
  mark for the same player in the same window is rejected

#### Scenario: Invalid mark

- **WHEN** the reason is blank, the player is unknown or the game is not in a
  day or night
- **THEN** the command is rejected and no mark is stored

### Requirement: Computed Mathematician count

The Mathematician SHALL learn the number of distinct characters marked since
the last Mathematician wake, SHALL count a working from the preceding day, and
SHALL clear the marks after the step resolves or is skipped.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Count and clear

- **WHEN** two characters are marked and the Mathematician wakes that night
- **THEN** the step shows 2 and the marks are removed after it completes

#### Scenario: Mark from the preceding day

- **WHEN** a character is marked during day 1 and the Mathematician wakes on
  night 2
- **THEN** the step counts that character

#### Scenario: Skipped wake

- **WHEN** the Mathematician step is skipped or its actor died
- **THEN** the window closes and the marks do not carry into a later wake

### Requirement: False Mathematician number

When the Mathematician is drunk or poisoned, or a living unimpaired Vortox is in
play, the engine SHALL keep the computed count but SHALL require a host number
from 0 to the player count, and SHALL store the chosen number. Under a living
unimpaired Vortox the true number SHALL NOT be offered or accepted. An impaired
Mathematician without a Vortox MAY receive any number, including the true one.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153), [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Host number required

- **WHEN** the Mathematician is impaired or a living unimpaired Vortox is in
  play
- **THEN** completing the step without a provided number is rejected and a
  provided option is stored

#### Scenario: Vortox true number

- **WHEN** the Mathematician is healthy and a living unimpaired Vortox is in
  play
- **THEN** the true number is not offered and a command that provides it is
  rejected

### Requirement: Evil Twin host correction

The engine SHALL let the Storyteller correct the Evil Twin pair through the
`manualCorrection` command with `kind: "twin"`, SHALL require an Evil Twin
holder, a different living partner of the opposite real alignment and a
non-empty reason, SHALL write both stored player ids and the good twin's role
on success, and SHALL change no setup field on rejection.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101)
**Tests**: `src/core/engine/twin-correction.test.ts`

#### Scenario: Evil holder with a good partner

- **WHEN** the holder has the `eviltwin` character and the host names a living
  good player
- **THEN** the command stores the holder as the evil twin, the named player as
  the good twin and the good player's role as the setup role

#### Scenario: Good holder with an evil partner

- **WHEN** a good player holds `eviltwin` after a character change and the host
  names a living evil player
- **THEN** the command stores the good holder first and the evil partner second

#### Scenario: Not an Evil Twin holder

- **WHEN** the named player does not hold the `eviltwin` character
- **THEN** the command is rejected with `error.75` and the setup is unchanged

#### Scenario: Same alignment

- **WHEN** the named partner has the same real alignment as the holder
- **THEN** the command is rejected with `error.76` and the setup is unchanged

#### Scenario: Replay and privacy

- **WHEN** the correction is applied through `applyCommand`
- **THEN** the applied id is recorded and the pair is not exposed in the public
  or player projections

### Requirement: The Dreamer pair is checked

The Dreamer step SHALL record the shown pair of one good and one evil
character. While the ability works and no Vortox lives, exactly one character
SHALL be the chosen player's character or a character that player legally
registers as. A pair that the constraint excludes SHALL be refused with
`error.66` and SHALL change no state.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904) "Summary", "How to Run" and the Vortox example; [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118); [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007); [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A sober Dreamer shows a pair

- **WHEN** a sober Dreamer without a living Vortox chooses a player
- **THEN** every offered pair holds the chosen player's character or a legal
  registered character, and a character of the opposite kind

#### Scenario: A Spy registers as another character

- **WHEN** the chosen player is a sober Spy or Recluse
- **THEN** a pair with a character that player may register as is legal

#### Scenario: The host submits a wrong pair

- **WHEN** the host submits a pair without a legal true character
- **THEN** the step is refused with `error.66` and nothing changes

#### Scenario: An impaired Dreamer may show a false pair

- **WHEN** the Dreamer is drunk or poisoned and no Vortox lives
- **THEN** the true pair and a false pair are both legal

#### Scenario: A Vortox forbids the true Dreamer pair

- **WHEN** a living Vortox is in play
- **THEN** no offered pair contains the chosen player's character

#### Scenario: The pair stays private and stored

- **WHEN** the host records a legal pair and the game is saved
- **THEN** the pair is a secret journal choice, export, import, preview,
  replay and undo keep it, and the public view omits it

### Requirement: The Dreamer pool is not narrowed by a script

The legal character pool SHALL be every supported character of the asked kind.
A custom script SHALL NOT narrow it. An empty legal list SHALL refuse every
answer instead of admitting a fabricated pair.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904) "How to Run"; Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A custom script keeps the legal answers

- **WHEN** the script lists only part of the edition
- **THEN** a supported character outside the script is still a legal answer

#### Scenario: No legal pair exists

- **WHEN** the chosen player has no character
- **THEN** no pair is offered and every submitted pair is refused

### Requirement: The Sage pair names the killer

The Sage step SHALL record the two players shown. While the ability works and
no Vortox lives, exactly one player SHALL be the Demon who killed the Sage. A
character or holder change after the kill SHALL NOT replace that player. A
death recorded before the attack stored its source SHALL fall back to the
current Demon.

**Source**: [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009) "How to Run" and its example; Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A sober Sage shows two players

- **WHEN** a sober Sage dies to a Demon attack
- **THEN** every offered pair holds exactly the Demon who killed the Sage

#### Scenario: The Demon character moves after the kill

- **WHEN** the Killer's character moves to another player before the Sage wakes
- **THEN** every offered pair still holds the Killer, and the current holder is
  not required

#### Scenario: The host submits a pair without the Killer

- **WHEN** the host submits two players neither of whom killed the Sage
- **THEN** the step is refused with `error.66` and nothing changes

#### Scenario: A dead player is shown

- **WHEN** the host shows a pair with a dead second player
- **THEN** the pair is legal

### Requirement: The Sage pair uses the pinned option set

An impaired Sage SHALL accept a pair with or without the Killer. A living
Vortox SHALL forbid every pair with the Killer. The pair SHALL be a secret
journal choice that changes no game state and stays out of the public view.

**Source**: [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009) "How to Run"; [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); Issue #216
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: An impaired Sage may show a false pair

- **WHEN** the Sage is drunk or poisoned at the step and no Vortox lives
- **THEN** a pair with the Killer and a pair without it are both legal

#### Scenario: A Vortox forbids the Killer pair

- **WHEN** a living Vortox is in play
- **THEN** no offered pair contains the Killer

### Requirement: A released journal keeps its Dreamer and Sage answers

A command recorded before the checked-pair version SHALL keep its free-text
note answer and SHALL replay without a pair. A current command SHALL require
the checked pair. Import, export, replay, undo and continuing an old game SHALL
preserve the recorded answers and SHALL NOT fabricate a host decision.

**Source**: Issue #216; the released 0.4.1 journal format
**Tests**: `src/core/engine/snv.test.ts`; `src/core/engine/fixtures/legacy-dreamer-sage-game.json`

#### Scenario: An old journal completes a sober Dreamer and Sage

- **WHEN** a 0.4.1 journal without a pair is imported and replayed
- **THEN** both steps complete with the old free-text note and the state equals
  the saved state

#### Scenario: An old false answer stays free text

- **WHEN** an old command carries a note answer for a Vortox or impaired
  Dreamer
- **THEN** the command is accepted and the note is stored

#### Scenario: A current command requires the pair

- **WHEN** a current command completes a sober Dreamer without a pair, or with
  a note
- **THEN** the step asks for the checked pair and changes nothing

#### Scenario: The game continues after an old command

- **WHEN** an old journal is undone and the night is ended with a current
  command
- **THEN** the command is accepted

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

### Requirement: The Barber swap follows the Barber's own sober death

The Barber step SHALL be appended only when the recent death record names the
Barber as the role at death and records that death as sober. A player who died
before becoming the Barber, or who died drunk or poisoned, SHALL get no swap.

**Source**: [Barber r1757](https://wiki.bloodontheclocktower.com/index.php?title=Barber&oldid=1757) "Summary"; [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Death before the character change

- **WHEN** a player dies and later becomes the Barber
- **THEN** no Barber step is appended for that player

#### Scenario: A drunk Barber dies

- **WHEN** the Barber dies while drunk or poisoned
- **THEN** no Barber step is appended

#### Scenario: A sober Barber dies

- **WHEN** the Barber dies sober and healthy
- **THEN** the Demon may swap two characters, as before

### Requirement: The Clockmaker distance ends at a Minion in play

The Clockmaker distance SHALL use every Minion in play, alive or dead. Only the
Demon must be alive.

**Source**: [Clockmaker r2967](https://wiki.bloodontheclocktower.com/index.php?title=Clockmaker&oldid=2967) "Summary"; [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168) "In play"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The nearest Minion is dead

- **WHEN** a dead Minion is the nearest Minion to the living Demon
- **THEN** the Clockmaker learns the distance to that Minion, not to a living
  Minion farther away

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

### Requirement: An impaired Sects and Violets Demon kills nobody

The S&V outcome path SHALL reject every recorded death when the acting Demon is
drunk or poisoned. The state SHALL stay unchanged.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039) "Drunk and poisoned"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A drunk Demon records a death

- **WHEN** an impaired Fang Gu step records a death
- **THEN** the outcome is rejected with `error.52` and the target stays alive

### Requirement: The Fang Gu jumps only on a death

The Fang Gu jump SHALL require a living Outsider target. An Outsider chosen
while already dead SHALL not change and the Fang Gu SHALL not die.

**Source**: [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974) "Summary"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The chosen Outsider is already dead

- **WHEN** the Fang Gu chooses a dead Outsider
- **THEN** the step completes without a jump and the Fang Gu stays alive

### Requirement: Impairment alone keeps the true answer legal

A drunk or poisoned Townsfolk information step SHALL offer the true value among
its legal answers. Only a living, unimpaired Vortox SHALL remove it.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039) "You can give them false information"; [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: An impaired Clockmaker

- **WHEN** the Clockmaker is drunk or poisoned and no Vortox is in play
- **THEN** the true distance is one of the offered answers

#### Scenario: A living Vortox

- **WHEN** a living, unimpaired Vortox is in play
- **THEN** the true value is not offered

### Requirement: The Evil Twin pair is one good and one evil player

When a character change creates the Evil Twin and a living player of the
opposite alignment exists, the pair SHALL contain one good and one evil player
regardless of which alignment the changed player has. The stored ids SHALL name
the good side and the evil side, so the good twin's execution wins for evil.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101) "Summary"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A good player becomes the Evil Twin

- **WHEN** the Pit-Hag turns a good player into the Evil Twin
- **THEN** an evil player becomes their twin, the changed player stays good and
  executing them wins for evil

#### Scenario: An evil player becomes the Evil Twin

- **WHEN** the Pit-Hag turns an evil non-Demon into the Evil Twin
- **THEN** a good player becomes their twin and executing that good player wins
  for evil

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

### Requirement: Incomplete manual voting requires host information

When the preceding day contains manually recorded totals or dead-vote token
bookkeeping, Flowergirl and Town Crier SHALL require a host answer even if a
partial nomination ledger exists. Totals and token use SHALL NOT establish
whether a Demon voted or a Minion nominated.

**Source**: [Flowergirl r2907](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=2907), [Town Crier r3145](https://wiki.bloodontheclocktower.com/index.php?title=Town_Crier&oldid=3145)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Total without identities

- **WHEN** the previous day contains a manual total but no complete voter identities
- **THEN** both roles require the Storyteller's yes or no

#### Scenario: Token-only record

- **WHEN** only a dead-vote marker was recorded outside the nomination ledger
- **THEN** the role information still requires the Storyteller's answer
