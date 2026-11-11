# Spec Delta

## ADDED Requirements

### Requirement: Vigormortis minion behaviour

The engine SHALL let a Minion killed by the Vigormortis keep its ability while
a living, unimpaired Vigormortis exists, SHALL stop the retention when the
Vigormortis dies or is impaired, SHALL poison one Townsfolk neighbour of the
killed Minion, and SHALL let the host name that neighbour.

**Source**: [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015), `docs/official/roles.json`
**Tests**: `js/snv.test.mjs`

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
**Tests**: `js/snv.test.mjs`

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
**Tests**: `js/snv.test.mjs`

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
**Tests**: `js/snv.test.mjs`

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
**Tests**: `js/snv.test.mjs`

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
**Tests**: `js/snv.test.mjs`

#### Scenario: Sage killed by the Demon

- **WHEN** the Demon kills the Sage
- **THEN** the Sage information step exists for the host to show two players

#### Scenario: Sage killed another way

- **WHEN** the Sage dies without a Demon kill
- **THEN** no Sage information step is appended

#### Scenario: Sweetheart death

- **WHEN** the dead Sweetheart chooses a player
- **THEN** that player is drunk permanently
