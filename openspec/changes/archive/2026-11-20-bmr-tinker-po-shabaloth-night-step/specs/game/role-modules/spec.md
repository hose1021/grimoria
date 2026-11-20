## ADDED Requirements

### Requirement: No-one record intent

The capability contract SHALL expose a `record-no-one` intent that says
whether the acting seat chose no one tonight. The engine SHALL write it on
the acting seat as the record of the acting role that the step builder
reads for the next night's step. The intent SHALL NOT name the record or
the seat it is written on.

**Source**: [Po r3104](https://wiki.bloodontheclocktower.com/index.php?title=Po&oldid=3104); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: No one chosen

- **WHEN** a resolver returns a `record-no-one` intent that says the seat chose no one
- **THEN** the acting seat's record for its role says so, and no other seat is written

#### Scenario: A player chosen

- **WHEN** the intent says the seat chose a player
- **THEN** the record says the seat did not choose no one

#### Scenario: The ability failed

- **WHEN** the intent is returned by a `suppressed` decision
- **THEN** the record is written as on the working path

#### Scenario: Another record or seat

- **WHEN** a role names the record or the seat to write
- **THEN** the type check rejects the module

### Requirement: Choices record intent

The capability contract SHALL expose a `record-choices` intent that names
the players the acting seat chose tonight. The engine SHALL keep the record
it replaces as last night's choice, then write tonight's players and night,
on the acting seat under the acting role and in the key order of the
stored record. The intent SHALL NOT name the record, the seat or last
night's choice.

**Source**: [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The first record

- **WHEN** a resolver returns a `record-choices` intent for two players on night N and the seat has no record yet
- **THEN** the record names no players for last night, no night for them, the two players in the host's order and night N, in that key order

#### Scenario: The next record

- **WHEN** the intent names one player on night N+1
- **THEN** last night's record names the two players of night N, and tonight's names the one player and night N+1

#### Scenario: The engine's copy

- **WHEN** the list of players the role returned changes after the step
- **THEN** the record does not change

#### Scenario: Another record, seat or night

- **WHEN** a role names the record, the seat or last night's players
- **THEN** the type check rejects the module

### Requirement: The Tinker declares its step from the second night

The Tinker role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first and SHALL NOT
declare a legacy night step. The resolver SHALL change nothing; the host
SHALL still mark the Tinker's death on the outcome of the step.

**Source**: [Tinker r1782](https://wiki.bloodontheclocktower.com/index.php?title=Tinker&oldid=1782); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/tinker/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with a Tinker in play
- **THEN** the queue holds no Tinker step, and the lookup returns no step and no resolver for that night

#### Scenario: The step is completed

- **WHEN** the Tinker's step is completed on a later night
- **THEN** no record, effect or death is written by the completion, and the step keeps the shared note and log line

#### Scenario: The host marks the death

- **WHEN** the host marks the Tinker's death on the step's outcome
- **THEN** the Tinker dies by ability, as before

### Requirement: The Po declares its step from the second night

The Po role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first and SHALL NOT
declare a legacy night step. Each completed step SHALL record whether the
Po chose no one, also when the Po is drunk or poisoned. After a night with
no choice the next step SHALL take three players.

**Source**: [Po r3104](https://wiki.bloodontheclocktower.com/index.php?title=Po&oldid=3104); [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/po/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: No one chosen

- **WHEN** the Po chooses no one on night N, sober or drunk or poisoned
- **THEN** the Po's step on night N+1 takes exactly three players

#### Scenario: Players chosen

- **WHEN** the Po chooses one or three players, or the Goon
- **THEN** the Po's next step takes no player or one

#### Scenario: The Po kept asleep

- **WHEN** the Po chose no one on night N and the Exorcist keeps it asleep on night N+1
- **THEN** the Po's step on night N+2 takes exactly three players

### Requirement: The Shabaloth declares its step from the second night

The Shabaloth role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first and SHALL NOT
declare a legacy night step. A sober and healthy Shabaloth SHALL record its
two players with last night's, so the outcome can regurgitate a player
chosen last night; a drunk or poisoned Shabaloth SHALL record nothing, as
before.

**Source**: [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790); [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/shabaloth/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: Two players recorded

- **WHEN** a sober and healthy Shabaloth chooses two players on night N
- **THEN** its record names them and night N, and the players of the night before as last night's

#### Scenario: A regurgitation

- **WHEN** the host regurgitates a dead player the Shabaloth chose on night N, on night N+1
- **THEN** the outcome accepts it and the player is alive again

#### Scenario: A drunk or poisoned Shabaloth

- **WHEN** a drunk or poisoned Shabaloth, or one who chose the Goon, completes its step
- **THEN** its record is unchanged

### Requirement: Moving the Tinker, the Po and the Shabaloth changes no outcome

Moving the Tinker's, the Po's and the Shabaloth's resolution to the
`night-step` capability SHALL NOT change a night queue, a step record, an
effect with its id and flag, a role's record, a death, a log line, a
command result or the order of draws from the command ports for the same
starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The same commands

- **WHEN** the same Tinker, Po or Shabaloth step is completed before and after the move
- **THEN** the step, the effects, the role's record with its key order, the log lines and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with Tinker, Po and Shabaloth steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state
