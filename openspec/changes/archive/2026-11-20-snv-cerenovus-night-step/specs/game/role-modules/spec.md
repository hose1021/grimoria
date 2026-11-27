## ADDED Requirements

### Requirement: Madness intent

The capability contract SHALL expose a `madness` intent that names a
player, a character and the first moment the madness no longer applies.
The engine SHALL write the madness token under the acting ability, with an
id made of the acting ability, the acting seat, the player and the night,
the acting seat as its source and the current moment as its start, and
SHALL keep a copy of the end.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A working ability

- **WHEN** a resolver returns a `madness` intent for player P, character C and an end at dawn of day N+1, on night N
- **THEN** one active token is written with the id of the ability, the seat, P and N, the character C, the seat as source, the night as start and the end, and nothing is drawn from the command ports

#### Scenario: The role's copy

- **WHEN** the end the role returned changes after the step
- **THEN** the token's end does not change

### Requirement: The madness token is the engine's to write

The engine SHALL write the madness token's keys in the order of the stored
token and SHALL write nothing on the `suppressed` path. The intent SHALL
NOT name the id, the owning ability, the source or whether the token
applies.

**Source**: `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A failed ability

- **WHEN** the intent is returned by a `suppressed` decision
- **THEN** no token is written

#### Scenario: Another id, owner, source or state

- **WHEN** a role names the token id, the owning ability, the source or whether the token applies
- **THEN** the type check rejects the module

### Requirement: The Cerenovus declares its step on every night

The Cerenovus role module SHALL declare its step and its resolver on one
`night-step` capability for every night and SHALL NOT declare a legacy
night step. A sober and healthy Cerenovus that names a player and a good
character SHALL make that player mad about the character until the next
dawn.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048); [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/cerenovus/role.test.ts`, `src/core/engine/snv.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: Every night

- **WHEN** a night starts with a living Cerenovus
- **THEN** the queue holds its step, taking one player, with the good characters of the script to choose

#### Scenario: A player made mad

- **WHEN** a sober and healthy Cerenovus names a player and a good character on night N
- **THEN** the player is mad about that character until the dawn of day N+1, and the step's note says so

#### Scenario: A Cerenovus the Vigormortis killed

- **WHEN** the Vigormortis has killed the Cerenovus and still lives
- **THEN** the dead Cerenovus wakes and its choice makes the player mad

### Requirement: A Cerenovus without a character or an ability makes nobody mad

A Cerenovus that names no character, or a drunk or poisoned Cerenovus,
SHALL make nobody mad and SHALL get the shared step note. The completion
SHALL still refuse a character that is not a Townsfolk or an Outsider of
the script with `error.2`.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/cerenovus/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: No character, or an impaired Cerenovus

- **WHEN** the Cerenovus names no character, or is drunk or poisoned
- **THEN** no token is written and the step gets the shared note

#### Scenario: An evil character

- **WHEN** the Cerenovus names a character that is not good
- **THEN** the command is rejected with `error.2` and the state is unchanged

### Requirement: Moving the Cerenovus changes no outcome

Moving the Cerenovus's resolution to the `night-step` capability SHALL NOT
change a night queue, a step record, an effect with its id and flag, a
seat's record, a death, a log line, a command result or the order of draws
from the command ports for the same starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The same commands

- **WHEN** the same Cerenovus step is completed before and after the move
- **THEN** the step, the madness token with its id, the seat's record, the log line and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with Cerenovus steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state
