## ADDED Requirements

### Requirement: Mathematician information capability

The Mathematician role module SHALL declare its every-night step through
`night-step` and SHALL answer through an `information` capability with
`infoKind: "mathematician"`. The answer SHALL be the number of distinct players
carrying an ABNORMAL reminder since the last Mathematician wake, and SHALL name
every number from 0 to the seat count as possible. The engine SHALL NOT hold a
second copy of the count.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/mathematician/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: The Mathematician learns the count

- **WHEN** a healthy Mathematician's step is completed and the Storyteller has marked some players abnormal
- **THEN** the step stores the number of distinct marked players as its answer, with no options, and the secret log holds one step line

#### Scenario: A duplicate mark counts once

- **WHEN** a legacy save or a host holds two ABNORMAL marks for the same player
- **THEN** the answer counts that player once

#### Scenario: The possible range is the seat count

- **WHEN** the answer is impaired or a Vortox falsifies it
- **THEN** the offered numbers run from 0 to the number of seats inclusive

### Requirement: The information context carries the abnormal count

The engine SHALL give an `information` capability the number of distinct
players marked abnormal since the last Mathematician wake. The context SHALL
expose a count and SHALL NOT expose a mark's reason, and it SHALL NOT reach the
game state. A role SHALL NOT clear the ledger.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); `docs/adr/0002-engine-contracts.md` §4; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/mathematician/role.test.ts`

#### Scenario: No marks

- **WHEN** the ledger is empty
- **THEN** the fact is 0

#### Scenario: Two distinct players and a duplicate

- **WHEN** two players are marked and one carries a second mark
- **THEN** the fact is 2, and a duplicate mark for one player adds nothing

#### Scenario: The reason stays private

- **WHEN** a capability reads the fact
- **THEN** it receives a number only, and the marking reason stays out of the context and the public view

### Requirement: The abnormal count stays one implementation

The count SHALL live in the engine's shared information fact builder, which
SHALL supply it to the context. The Sects & Violets answer factory SHALL
re-export the binding so its public import does not change, and SHALL NOT hold
a second copy. The fact builder SHALL NOT import the Sects & Violets answer
factory. A role module SHALL NOT import the engine.

**Source**: `docs/adr/0002-engine-contracts.md` §3; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/architecture.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The dispatcher and the answer factory share the fact

- **WHEN** the information dispatcher and the Sects & Violets answer factory build a context
- **THEN** they read the one count in `information-facts.ts`, the answer factory re-exports it, and the role modules stay free of engine imports

### Requirement: The Mathematician keeps the shared answer wrapper

The Mathematician SHALL return the true count and the full possible set whether
or not its owner is impaired, and SHALL NOT mark an answer as false. The engine
SHALL keep the impairment flag, the living-Vortox rule, the options, the
suffixes, the text and the stored record unchanged, and SHALL still clear the
ledger after the step.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153), [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: An impaired owner may still receive the truth

- **WHEN** the Mathematician is drunk or poisoned
- **THEN** the host is asked, the true count stays among the options, and `mayBeFalseSuffix` is true

#### Scenario: A living Vortox forbids the truth

- **WHEN** a living, unimpaired Vortox is in play
- **THEN** the options exclude the true count, `falsifiedSuffix` is true and `mayBeFalseSuffix` is false

#### Scenario: Both at once

- **WHEN** the Mathematician is impaired and a living Vortox is in play
- **THEN** the options exclude the true count and the Vortox flags are kept

#### Scenario: The host's answer is journaled in secret

- **WHEN** an impaired Mathematician's answer is applied
- **THEN** the secret log holds a `false-information` case and the public view omits the answer and the mark reason

#### Scenario: The ledger clears after the step

- **WHEN** the Mathematician's step completes or is skipped
- **THEN** the ABNORMAL reminders are removed by the engine, not the role

#### Scenario: The stored record is unchanged

- **WHEN** the same Mathematician step is completed before and after the move
- **THEN** the step, the `given` record, the text, the log lines, the command events and the command result are identical
