## ADDED Requirements

### Requirement: The Spy declares a step for every night

The Spy role module SHALL declare its step on the `night-step` arm for every
night, with the `grimoire` shape, no target and no resolver, and SHALL NOT
declare a legacy night step. The engine's information path and its step
completion SHALL NOT name the Spy for the answer of the step, and the engine
SHALL keep no table of answer shapes by role.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/spy/role.test.ts`, `src/core/engine/engine.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with a Spy in play
- **THEN** the queue holds the Spy's step last, with no target and the `grimoire` shape

#### Scenario: Later nights

- **WHEN** the second and the third night start
- **THEN** the queue holds the Spy's step again, last, with the same shape

#### Scenario: A Spy killed before its step

- **WHEN** the Demon kills the Spy on a night before the Spy's step
- **THEN** the step is closed with the note of a dead actor, cannot be completed, and the Spy has no step on later nights

#### Scenario: The ledger

- **WHEN** the ownership ledger is generated
- **THEN** the Spy's row declares the `night-step`, `information` and `adjudication` capabilities and keeps the engine references of its registration

### Requirement: A role may answer that its ability shows the Grimoire

The `information` capability MAY return `grimoire`, which carries no value, no
possible values and no text. The engine SHALL then record
`{ kind: "grimoire" }` as the answer of the step, whatever shape the step
declares, SHALL ask the host nothing and SHALL write a new record on each
read. The Spy SHALL return this decision and SHALL read no fact.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118) "How to Run"; `docs/adr/0002-engine-contracts.md` §2 and §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/roles/spy/role.test.ts`

#### Scenario: A healthy Spy

- **WHEN** the step of a sober and healthy Spy is completed on the first or on the second night
- **THEN** the step stores the Grimoire record and the secret log holds one step line

#### Scenario: The role reads nothing

- **WHEN** the Spy's capability is resolved with a context that fails on every read
- **THEN** it returns the decision, and the decision holds only its kind

#### Scenario: A decision that names something

- **WHEN** a role returns `grimoire` with a value, possible values, a text or a mark of impairment
- **THEN** the type check rejects the module

#### Scenario: Another module

- **WHEN** a module returns `grimoire` on a step that declares another shape
- **THEN** the record is the Grimoire, and two reads give two records

#### Scenario: Outcomes do not change

- **WHEN** the same step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: An answer sent with a Grimoire step is not stored

When the record of a step is the Grimoire, the step completion SHALL store
that record and SHALL NOT store or check an answer sent with the step.
Players, a registration and a redirect sent with the step SHALL be handled by
the shared end of a step as before this change.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: An answer nobody asked for

- **WHEN** the Spy's step is sent with a number, a character or a Grimoire record that carries a text
- **THEN** the step is completed, stores the Grimoire record, and the secret log holds no choice line

#### Scenario: Players sent with the step

- **WHEN** a player is sent with the Spy's step
- **THEN** the step stores the player as sent

#### Scenario: The Spy's own registration

- **WHEN** the Spy's registration as good is sent with its step
- **THEN** the secret log holds a registration choice line and then the step line

#### Scenario: Another player's registration

- **WHEN** a registration for a player who has none is sent with the step
- **THEN** the step is refused with `error.67` and the game is as it was

#### Scenario: A redirect

- **WHEN** a redirect is sent with the Spy's step
- **THEN** it is journaled as before this change, and the step keeps no redirect

### Requirement: An impaired Spy has the same record

When the owner of a Grimoire step is drunk or poisoned, the engine SHALL
record the same `{ kind: "grimoire" }`, SHALL ask the host nothing and SHALL
mark the step as impaired. The role SHALL return the same decision whether or
not its owner is impaired. Showing a false Grimoire SHALL stay with the
Storyteller at the table.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Poisoner r1737](https://wiki.bloodontheclocktower.com/index.php?title=Poisoner&oldid=1737), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168) "Poisoned"; `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/spy/role.test.ts`

#### Scenario: A poisoned Spy

- **WHEN** the Poisoner chooses the Spy and the Spy's step is completed without an answer
- **THEN** the step stores the Grimoire record and is marked as impaired, and the secret log holds one step line and no false-information line

#### Scenario: The role does not read impairment

- **WHEN** the Spy's capability is resolved with a context that records every read
- **THEN** no fact is read, `impaired` included

#### Scenario: Another module with an impaired owner

- **WHEN** a module returns `grimoire` and its owner is poisoned
- **THEN** the record has no question and no mark of impairment

### Requirement: A role step without an answer has no information

`infoForStep` SHALL return `{ kind: "none" }` for a step of a role whose module
owns no answer and for a step without a role. A role step SHALL take the shape
of its answer from the declaration of its module alone, and `none` when the
module declares no shape.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A role that owns no answer

- **WHEN** the information of a Poisoner, Monk or Imp step is read, with or without a chosen player
- **THEN** it is `{ kind: "none" }`

#### Scenario: A step without a role

- **WHEN** the information of a role step whose role is cleared is read
- **THEN** it is `{ kind: "none" }`
