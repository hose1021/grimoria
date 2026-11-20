## ADDED Requirements

### Requirement: Chef information capability

The Chef role module SHALL declare its step through the `night-step`
capability for the first night, with no target and the number shape. Its
`information` capability SHALL answer with the number of neighbouring pairs
around the seat ring whose players both register as evil, and SHALL name every
number from 0 to the seat count as the possible answers. The engine's
information and step completion paths SHALL NOT name the Chef.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/chef/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Chef learns the count

- **WHEN** a healthy Chef's step is completed and no Spy or Recluse can change the count
- **THEN** the step stores the number of pairs of neighbouring evil players as its answer, with no options, and the secret log holds one step line

#### Scenario: The ring closes

- **WHEN** evil players sit in the last seat and the first seat
- **THEN** they are one pair

#### Scenario: Three evil players in a row

- **WHEN** three evil players sit next to each other
- **THEN** the count is two, because the player in the middle is part of two pairs

#### Scenario: The Chef wakes once

- **WHEN** a later night starts
- **THEN** the night has no Chef step

#### Scenario: An impaired Chef waits for the host

- **WHEN** the Chef is drunk or poisoned, or is a Drunk shown the Chef, and the step is sent without an answer
- **THEN** the engine returns the question with every number from 0 to the player count as the options, and the game, the journal and the command stream are as they were

#### Scenario: The host answers for an impaired Chef

- **WHEN** the step is sent again with one of the offered numbers
- **THEN** the step stores that number and is marked impaired, and the answer is journaled as false information after the step line

#### Scenario: Outcomes do not change

- **WHEN** the same Chef step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: The Chef names the legal counts under registration

The Chef's `information` capability SHALL name as legal every count from the
pairs in which neither player may register as good to the pairs in which both
players may register as evil. The computed count SHALL follow the teams the
host registered for the step; the legal counts SHALL NOT. The role SHALL NOT
name the Spy or the Recluse or read their impairment.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510) Example 4, [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118); `docs/rules-matrix.md` TB-CHEF-02; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/chef/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: A Recluse between two evil players

- **WHEN** a sober and healthy Recluse sits between the Imp and the Poisoner
- **THEN** the legal counts are 0, 1 and 2, and a healthy Chef's step waits for the host's count

#### Scenario: A Spy beside the Demon

- **WHEN** a sober and healthy Spy sits beside the Imp and no other evil players are neighbours
- **THEN** the legal counts are 0 and 1

#### Scenario: The host answers the range

- **WHEN** the step is sent with one of the legal counts
- **THEN** the step stores the host's answer as it was sent, and the answer is journaled as a registration ambiguity after the step line

#### Scenario: A count outside the range

- **WHEN** the step is sent with a count that no registration makes true
- **THEN** the engine refuses it with `error.66` and the game is as it was

#### Scenario: The host registers the Recluse for the step

- **WHEN** the step is sent with the Recluse registered as evil
- **THEN** the computed count rises, the offered range is the same, and the registration is journaled before the step line

#### Scenario: A poisoned Recluse

- **WHEN** the Recluse is drunk or poisoned
- **THEN** one count is legal, the step asks nothing, and a registration sent for the Recluse is refused with `error.67`

### Requirement: A working ability with several legal answers asks the host

The `answer` decision of the `information` capability MAY carry the values a
working ability may show when the answer depends on how a player registers.
When a working ability names more than one, the engine SHALL ask the host and
offer a copy of them. An impaired owner SHALL be offered the possible values
instead. A role SHALL return the same decision whether or not its owner is
impaired.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510) Example 4, [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` §3 and §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/chef/role.test.ts`

#### Scenario: Several legal answers

- **WHEN** a module answers for a sober and healthy owner and names two legal values
- **THEN** the engine asks the host and offers those two values

#### Scenario: One legal answer

- **WHEN** a module names one legal value or none
- **THEN** the engine shows the module's answer and asks nothing

#### Scenario: The owner is impaired

- **WHEN** a module names legal values and its owner is drunk or poisoned
- **THEN** the host is offered the possible values, not the legal ones

### Requirement: An information role reads the seats and who may register as a team

The engine SHALL give an `information` capability the seats in order around
the circle and, for a player and a team, whether the player may register as
that team to this ability: their own team, or the other one for a Recluse or a
Spy that is sober and healthy. The answer SHALL NOT depend on the
registrations the host sent with the step.

**Source**: [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A Spy and a Recluse

- **WHEN** an information capability asks about a sober and healthy Spy or Recluse
- **THEN** the player may register as good and as evil

#### Scenario: Other players

- **WHEN** it asks about any other player
- **THEN** the player may register as their own team only

#### Scenario: A drunk or poisoned registrant

- **WHEN** the Spy or the Recluse is drunk or poisoned
- **THEN** that player may register as their own team only

#### Scenario: A role asks about a character type

- **WHEN** a role asks whether a player may register as anything but good or evil
- **THEN** the type check rejects the module

### Requirement: The Chef query holds no rule

The engine's exported query `chefCount` SHALL keep its signature and SHALL
answer by resolving the Chef module's `information` capability with the
engine's facts. The engine SHALL NOT hold a second copy of the count or of the
legal range.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/host-choice.test.ts`

#### Scenario: The query is asked outside a step

- **WHEN** a caller asks how many pairs a Chef would count, with or without registrations
- **THEN** the answer is the one the role module gives
