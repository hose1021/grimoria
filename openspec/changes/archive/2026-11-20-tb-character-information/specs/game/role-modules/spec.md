## ADDED Requirements

### Requirement: Undertaker information capability

The Undertaker role module SHALL answer through an `information` capability
with the character recorded at the death by execution today. It SHALL name the
executed player as the subject of the answer, every character as the possible
answers and the characters that player may register as as the legal ones.
Without such a death it SHALL return a note. The engine's information and step
completion paths SHALL NOT name the Undertaker.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/undertaker/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Undertaker learns the executed character

- **WHEN** a player died by execution today and a healthy Undertaker's step is completed
- **THEN** the step stores that player's character and the player, lists that one character, asks nothing, and the secret log holds one step line

#### Scenario: An executed Drunk

- **WHEN** the executed player is the Drunk
- **THEN** the answer is the Drunk, not the Townsfolk the Drunk was shown

#### Scenario: An executed Spy or Recluse

- **WHEN** the executed player is a sober and healthy Spy or Recluse
- **THEN** the step waits for the host, who is offered the real character first and then every character that player may register as, and the host's answer is journaled as a registration ambiguity after the step line

#### Scenario: An answer that was not offered

- **WHEN** the step is sent with a character outside the offered list
- **THEN** the engine refuses it with `error.66` and the game is as it was

#### Scenario: No execution today

- **WHEN** the day ended without a death by execution
- **THEN** the night has no Undertaker step, also when a player died at night

#### Scenario: An impaired Undertaker waits for the host

- **WHEN** the Undertaker is drunk or poisoned, or is a Drunk shown the Undertaker, and the step is sent without an answer
- **THEN** the engine returns the question with every character as the options, and the game, the journal and the command stream are as they were

#### Scenario: Outcomes do not change

- **WHEN** the same Undertaker step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Ravenkeeper information capability

The Ravenkeeper role module SHALL declare one player, alive or dead, as its
target and the character shape of its answer. Its `information` capability
SHALL answer with the character of the first chosen player, name that player
as the subject, every character as the possible answers and the characters
that player may register as as the legal ones. The engine's information path
and the completion of the step SHALL NOT name the Ravenkeeper.

**Source**: [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/ravenkeeper/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Ravenkeeper learns the chosen character

- **WHEN** the Ravenkeeper died tonight, chooses a player and the healthy step is completed
- **THEN** the step stores the chosen player's character and the player, lists that one character, asks nothing, and the secret log holds one step line

#### Scenario: Any player may be chosen

- **WHEN** the Ravenkeeper chooses a dead player, the Demon or its own seat
- **THEN** the step is completed with that player's character

#### Scenario: A chosen Spy or Recluse

- **WHEN** the chosen player is a sober and healthy Spy or Recluse, alive or dead
- **THEN** the step waits for the host, who is offered the real character first and then every character that player may register as

#### Scenario: A poisoned Recluse

- **WHEN** the chosen Recluse is drunk or poisoned
- **THEN** the Recluse is the one legal character and the step asks nothing

#### Scenario: An impaired Ravenkeeper

- **WHEN** the Ravenkeeper was drunk or poisoned when it died, or is a Drunk shown the Ravenkeeper
- **THEN** the host is asked with every character as the options, and the answer is journaled as false information

#### Scenario: Outcomes do not change

- **WHEN** the same Ravenkeeper step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: The wake of a character role stays with its step

The Undertaker's step SHALL be built only on a night after a death by
execution, and the Ravenkeeper's step SHALL be appended on the night the
Ravenkeeper dies, as before this change. Both modules SHALL declare the
`character` shape in the step that holds their wake. A capability SHALL NOT
receive the game state to decide who wakes.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/undertaker/role.test.ts`, `src/core/roles/ravenkeeper/role.test.ts`, `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The Undertaker's step

- **WHEN** the second night starts after an execution
- **THEN** the queue holds the Undertaker's step with no target, the character shape and the executed player and character on it

#### Scenario: The Ravenkeeper's step

- **WHEN** the Imp kills the Ravenkeeper
- **THEN** the step is inserted after the Imp's step with one player of any state as its target, the character shape and the mark that its owner died tonight

#### Scenario: The ledger shows both forms

- **WHEN** the ownership ledger is generated
- **THEN** both rows declare the legacy step and the `information` capability, the Undertaker has no engine reference and the Ravenkeeper keeps the references of its appended step

### Requirement: A character answer names its player and lists the characters the host may show

The `answer` decision of the `information` capability MAY name the player the
answer is about. For a step that declares the `character` shape the engine
SHALL record the answer as the character and the subject as the player. It
SHALL list a copy of the legal characters for a working ability, also when
there is one, and of the possible characters for an impaired owner, and SHALL
ask the host when the owner is impaired or more than one character is legal.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115) Example 3, [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125) Example 2, [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` §3 and §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: One legal character

- **WHEN** a module answers with a character, its player and one legal character for a sober and healthy owner
- **THEN** the record holds the character, the player and that one character as the list, and the host is not asked

#### Scenario: Several legal characters

- **WHEN** the module names two legal characters
- **THEN** the engine asks the host and offers those two

#### Scenario: The owner is impaired

- **WHEN** the owner is drunk or poisoned
- **THEN** the host is offered the possible characters, not the legal ones

#### Scenario: A role writes the record's own field

- **WHEN** a role returns an answer with the field of the step's record for the player
- **THEN** the type check rejects the module

### Requirement: A role with nothing to learn returns a note or no answer

The `information` capability MAY return a note with a text. The engine SHALL
store the text as the answer of the step and SHALL ask nobody, whether or not
the owner is impaired. When a role returns no answer for a step that declares
the `character` shape, the engine SHALL return a question with a copy of every
character; for any other shape it SHALL return no information.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A note

- **WHEN** a module returns a note for a healthy or an impaired owner
- **THEN** the answer of the step is the text of the note, with no question

#### Scenario: A note carries no answer

- **WHEN** a role returns a note with a value or with a demand for the host's answer
- **THEN** the type check rejects the module

#### Scenario: The Ravenkeeper before a player is chosen

- **WHEN** the Ravenkeeper's step is read with no chosen player
- **THEN** the engine returns a character question with every character, and a completion without a player is refused before anything is written

#### Scenario: Another shape without an answer

- **WHEN** a module of a number or a yes or no step returns no answer
- **THEN** the step has no information

### Requirement: An information role reads the execution of the day and the characters a player may register as

The engine SHALL give an `information` capability the player who died by
execution on the day before the night of the step, with the character
recorded at the death, and, for a player, the characters that player may
register as: their own first, then every Minion and Demon for a sober and
healthy Recluse, or every Townsfolk and Outsider for a sober and healthy Spy.
The owner's impairment SHALL NOT change that list.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: An execution today

- **WHEN** a player was executed and died on the day before the night
- **THEN** the capability is told that player and the character recorded at the death

#### Scenario: No execution today

- **WHEN** it is the first night, the day had no execution, a player died at night, or the execution was on an earlier day
- **THEN** the capability is told that nobody died by execution today

#### Scenario: A Spy and a Recluse

- **WHEN** an information capability asks about a sober and healthy Spy or Recluse
- **THEN** the list starts with the real character and continues with the characters of the other side's types

#### Scenario: Other players and impaired registrants

- **WHEN** it asks about any other player, or about a drunk or poisoned Spy or Recluse
- **THEN** the list holds the player's own character only

#### Scenario: The role asks for the death records

- **WHEN** a role reads the list of deaths or the cause of the execution from its context
- **THEN** the type check rejects the module
