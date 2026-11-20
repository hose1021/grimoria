## ADDED Requirements

### Requirement: Washerwoman, Librarian and Investigator declare a first-night step

The Washerwoman, Librarian and Investigator role modules SHALL each declare
their step on the `night-step` arm for the first night only, with the
`one-of-two` shape and no resolver. The engine's table of answer shapes, its
information path and its step completion SHALL NOT name the three roles.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/washerwoman/role.test.ts`, `src/core/roles/librarian/role.test.ts`, `src/core/roles/investigator/role.test.ts`, `src/core/engine/engine.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with the three roles in play
- **THEN** the queue holds one step for each, in the printed order after the Poisoner, with no target and the `one-of-two` shape

#### Scenario: Later nights

- **WHEN** the second night starts
- **THEN** the queue holds no step for any of the three roles

#### Scenario: The ledger

- **WHEN** the ownership ledger is generated
- **THEN** the three rows declare the `night-step` and `information` capabilities and keep only their references in `setup.ts`

### Requirement: A role may answer with the answer prepared in setup

The `information` capability MAY return `prepared` with the characters the
answer can show. The engine SHALL then read the answer the Storyteller
prepared in setup under the id of the role and record the character, a copy of
the two players and the Storyteller's mark of the real one. The role SHALL NOT
be given the prepared answer and SHALL return the same decision whether or not
its owner is drunk or poisoned.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) "How to Run", [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983); `docs/adr/0002-engine-contracts.md` §2 and §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/roles/washerwoman/role.test.ts`, `src/core/roles/librarian/role.test.ts`, `src/core/roles/investigator/role.test.ts`

#### Scenario: A healthy owner

- **WHEN** a pair is prepared and the step of a sober and healthy owner is completed
- **THEN** the step stores the prepared character, the two players and the mark, offers nothing, and the secret log holds one step line

#### Scenario: The answer is read when the step is read

- **WHEN** the host changes the prepared answer during the first night, before the step
- **THEN** the step shows and stores the new answer

#### Scenario: The role reads nothing

- **WHEN** the capability of any of the three roles is resolved with a context that fails on every read
- **THEN** it returns the decision, and the decision holds only its kind and the possible characters

#### Scenario: A role names the answer itself

- **WHEN** a role returns `prepared` with a character, two players, a zero or a mark that setup is incomplete, or without the possible characters
- **THEN** the type check rejects the module

#### Scenario: Outcomes do not change

- **WHEN** the same step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Each one-of-two role names the characters of its type

The Washerwoman SHALL name every Townsfolk as the possible answers, the
Librarian every Outsider and the Investigator every Minion, in the order of
the script catalog. The engine SHALL offer an impaired owner a copy of the
characters its role names, SHALL refuse an answer outside them with
`error.66`, and SHALL journal the host's answer as false information.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/washerwoman/role.test.ts`, `src/core/roles/librarian/role.test.ts`, `src/core/roles/investigator/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: A poisoned Washerwoman

- **WHEN** the Washerwoman is poisoned and the step is sent without an answer
- **THEN** the engine returns the question with the thirteen Townsfolk, and the game, the journal and the command stream are as they were

#### Scenario: A poisoned Librarian or Investigator

- **WHEN** the Librarian or the Investigator is poisoned and a pair is prepared
- **THEN** the host is offered the four Outsiders, the Drunk among them, or the four Minions, and not the zero

#### Scenario: An answer that was not offered

- **WHEN** the host answers with a character of another type
- **THEN** the engine refuses it with `error.66` and writes nothing

#### Scenario: The host's answer

- **WHEN** the host answers with an offered character and two players
- **THEN** the step stores the answer as it was sent and the secret log holds the step line and then a false-information line with the two players

#### Scenario: A Drunk shown the role

- **WHEN** a Drunk shown one of the three roles takes the step with a false answer prepared for it
- **THEN** the host is asked with that answer and the characters of the shown role's type

### Requirement: A step without a prepared answer asks for setup

When the record of the role is absent, names no character or does not name
two players, the engine SHALL return a record marked as missing, and the step
completion SHALL refuse the step with `error.44` and a request for setup,
writing nothing. It SHALL do so for an impaired owner as well and when an
answer is sent with the step.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) "How to Run"; `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The host cleared the character

- **WHEN** the prepared character is cleared during the night and the step is sent
- **THEN** the command asks for setup with `error.44`, and the game and the journal are as they were

#### Scenario: An answer does not stand in for setup

- **WHEN** the same step is sent with a pair as the host's answer
- **THEN** it is refused the same way

#### Scenario: The host prepares the answer

- **WHEN** the host then prepares a character and two players and sends the step again
- **THEN** the step is completed with that answer

### Requirement: A Drunk with no prepared record is offered a default false answer

When a Drunk shown the role takes the step and setup holds no record for that
role at all, the engine SHALL ask the host and offer the characters the role
names, with the first of them and the first two other seats as the default. A
record that is present but incomplete SHALL ask for setup instead.

**Source**: [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A game saved before the false answer was asked for

- **WHEN** a Drunk shown the Investigator takes the step and no record exists
- **THEN** the host is asked with the four Minions, the Poisoner and the first two other seats as the default, and the answer is journaled as false information

#### Scenario: An incomplete record

- **WHEN** the record of the Drunk's shown role names no character
- **THEN** the step asks for setup

### Requirement: The zero record stays with the engine

When the prepared record is a zero, the engine SHALL record for a working
ability that no Outsider is in play, and SHALL offer an impaired owner every
Outsider and the zero with the first two other seats as the default pair. It
SHALL write that record for whichever role holds a zero, as before this
change. A role SHALL NOT declare the zero.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A Librarian with no Outsider in play

- **WHEN** no Outsider is in play and the healthy Librarian's step is completed
- **THEN** the step stores the zero with its sentence and asks nothing

#### Scenario: A poisoned Librarian with a prepared zero

- **WHEN** the Librarian is poisoned and the zero is prepared
- **THEN** the host is offered every Outsider and the zero, an answer that claims the zero and names a character is refused with `error.66`, and the zero is journaled as false information with the detail "0"

#### Scenario: A Drunk shown the Librarian

- **WHEN** the zero is prepared as the false answer of a Drunk shown the Librarian
- **THEN** the night starts and the host is offered every Outsider and the zero

#### Scenario: A zero written for another role after the night began

- **WHEN** a zero is written for the Washerwoman or the Investigator during the first night
- **THEN** the step is answered as before this change, with the sentence and the options of the Librarian's zero, while the setup check reports the record as incomplete
