## MODIFIED Requirements

### Requirement: A role may answer with the answer prepared in setup

The `information` capability MAY return `prepared` with the characters the
answer can show, and with `orZero` when its ability has a zero answer. The
engine SHALL then read the answer the Storyteller prepared in setup under the
id of the role and record it. The role SHALL NOT be given the prepared answer,
SHALL NOT say whether zero are in play, and SHALL return the same decision
whether or not its owner is drunk or poisoned.

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
- **THEN** it returns the decision, and the decision holds only its kind, the possible characters and, for the Librarian, the declaration of the zero

#### Scenario: Only the Librarian declares the zero

- **WHEN** the decisions of the Washerwoman, the Librarian and the Investigator are read
- **THEN** the Librarian's holds `orZero: true` and the other two hold no `orZero`

#### Scenario: A role names the answer itself

- **WHEN** a role returns `prepared` with a character, two players, a `zero` or a mark that setup is incomplete, or without the possible characters
- **THEN** the type check rejects the module

#### Scenario: A declaration is not a fact

- **WHEN** a role returns `prepared` with `orZero: false`, or a computed answer with `orZero`
- **THEN** the type check rejects the module

#### Scenario: Outcomes of a prepared pair and of the Librarian's zero do not change

- **WHEN** a step with a prepared pair, or a Librarian's step with a zero, is completed before and after this change
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

#### Scenario: Outcomes do not change

- **WHEN** the same step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: A step without a prepared answer asks for setup

When the record of the role is absent, names no character, does not name two
players, or is a zero and the role declares none, the engine SHALL return a
record marked as missing, and the step completion SHALL refuse the step with
`error.44` and a request for setup, writing nothing. It SHALL do so for an
impaired owner as well and when an answer is sent with the step.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) "How to Run", [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
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

#### Scenario: A zero for a role that declares none

- **WHEN** the record of the Washerwoman or the Investigator is a zero and the step is sent
- **THEN** the command asks for setup with `error.44`, whether the owner is healthy, poisoned or a Drunk shown the role

### Requirement: The zero record stays with the engine

When the prepared record is a zero and the role declares `orZero`, the engine
SHALL record for a working ability that no Outsider is in play, and SHALL
offer an impaired owner every Outsider and the zero with the first two other
seats as the default pair. It SHALL write that record for whichever role holds
a zero, as before this change. The role SHALL declare only that its ability has
a zero answer: the sentence, the options and whether zero are in play SHALL
stay outside the role.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/roles/librarian/role.test.ts`

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

#### Scenario: The declaration decides, not the id

- **WHEN** a module of any id declares `orZero` and holds a zero, and its owner is impaired
- **THEN** the host is offered every Outsider and the zero, not the characters the module names

#### Scenario: A role that declares no zero

- **WHEN** a module that declares no `orZero` holds a zero
- **THEN** the engine writes no zero record for it and the step is marked as missing
