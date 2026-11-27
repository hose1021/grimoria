## ADDED Requirements

### Requirement: The Sects & Violets information roles declare their step on the night-step capability

The Clockmaker, the Dreamer, the Evil Twin, the Flowergirl, the
Mathematician, the Oracle and the Town Crier role modules SHALL each
declare their step on one `night-step` capability and SHALL NOT declare a
legacy night step: the Clockmaker and the Evil Twin for the first night
only, the Dreamer and the Mathematician for every night, and the
Flowergirl, the Oracle and the Town Crier for every night except the
first.

**Source**: [Clockmaker r2967](https://wiki.bloodontheclocktower.com/index.php?title=Clockmaker&oldid=2967); [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904); [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101); [Flowergirl r2907](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=2907); [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); [Oracle r2909](https://wiki.bloodontheclocktower.com/index.php?title=Oracle&oldid=2909); [Town Crier r3145](https://wiki.bloodontheclocktower.com/index.php?title=Town_Crier&oldid=3145); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/clockmaker/role.test.ts`, `src/core/roles/dreamer/role.test.ts`, `src/core/roles/eviltwin/role.test.ts`, `src/core/roles/flowergirl/role.test.ts`, `src/core/roles/mathematician/role.test.ts`, `src/core/roles/oracle/role.test.ts`, `src/core/roles/towncrier/role.test.ts`, `src/core/engine/snv.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with the seven roles in play
- **THEN** the Evil Twin, the Clockmaker, the Dreamer and the Mathematician have a step, and the Flowergirl, the Oracle and the Town Crier do not

#### Scenario: A later night

- **WHEN** a later night starts
- **THEN** the Dreamer, the Flowergirl, the Town Crier, the Oracle and the Mathematician have a step, and the Clockmaker and the Evil Twin do not

#### Scenario: A Philosopher who gains one of the abilities

- **WHEN** a Philosopher gains the Oracle on a later night, the Clockmaker on a later night, or the Flowergirl on the first night
- **THEN** they wake for the Oracle in its slot that night, for the Clockmaker right after their own step, and for the Flowergirl from the next night

#### Scenario: A character the Pit-Hag creates

- **WHEN** the Pit-Hag makes a player the Town Crier or the Clockmaker on a later night
- **THEN** the new Town Crier wakes in its slot that night, and the new Clockmaker does not wake

### Requirement: The information roles keep their answers in the engine until their own change

Until their answers move, none of the seven information roles SHALL own a
night-step resolver, so the step completion keeps their stored answer and
the Mathematician's removal of the ABNORMAL marks.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/mathematician/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A completed step

- **WHEN** one of the seven steps is completed
- **THEN** it stores the answer computed for it and the shared note, writes no effect, and the Mathematician's step clears the ABNORMAL marks

### Requirement: Moving the information roles' steps changes no outcome

Moving the seven steps to the `night-step` capability SHALL NOT change a
night queue, a step record, a stored answer, an effect, a log line, a
command result or the order of draws from the command ports for the same
starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The same commands

- **WHEN** the same information step is completed before and after the move
- **THEN** the step with its stored answer, the effects, the log line and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with these steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state
