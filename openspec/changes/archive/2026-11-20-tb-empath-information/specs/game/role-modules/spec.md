## ADDED Requirements

### Requirement: Empath information capability

The Empath role module SHALL declare its step through the `night-step`
capability for every night, with no target and the number shape. Its
`information` capability SHALL answer with the count of its two nearest living
neighbours whose registered team is evil, and SHALL name 0, 1 and 2 as the
possible answers. The engine's information and step completion paths SHALL NOT
name the Empath.

**Source**: [Empath r1724](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=1724), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/empath/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Empath learns the count

- **WHEN** a healthy Empath's step is completed
- **THEN** the step stores the number of evil players among the two nearest living neighbours as its answer, with no options, and the secret log holds one step line

#### Scenario: A dead neighbour is skipped

- **WHEN** a neighbour of the Empath is dead
- **THEN** the count reads the closest living player in that direction

#### Scenario: The host registers a Spy or a Recluse

- **WHEN** the step is completed with a Spy registered as good or a Recluse registered as evil
- **THEN** the count reads the registered team, and the registration is journaled before the step line

#### Scenario: An impaired Empath waits for the host

- **WHEN** the Empath is drunk or poisoned, or is a Drunk shown the Empath, and the step is sent without an answer
- **THEN** the engine returns the question with 0, 1 and 2 as the options, and the game, the journal and the command stream are as they were

#### Scenario: The host answers for an impaired Empath

- **WHEN** the step is sent again with one of the offered numbers
- **THEN** the step stores that number and is marked impaired, and the answer is journaled as false information after the step line

#### Scenario: Outcomes do not change

- **WHEN** the same Empath step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: An information answer names its possible values

The `answer` decision of the `information` capability SHALL carry the value
the ability learns and MAY carry every value that answer can take. A role
SHALL return the same decision whether or not its owner is impaired. The
decision SHALL NOT state that the owner is impaired, that the host must
choose, or which options the host is offered.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/empath/role.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The owner is impaired

- **WHEN** an information capability resolves for a drunk or poisoned owner
- **THEN** it returns the same value and the same possible answers as for a working one

#### Scenario: A role names what the engine owns

- **WHEN** a role states impairment, a required host choice or the offered options in the decision, or reads the game state
- **THEN** the type check rejects the module

### Requirement: The engine asks the host for an impaired information role

For a role module that declares an `information` capability, the engine SHALL
show a working ability the module's answer and offer nothing. For an impaired
owner it SHALL ask the host and offer a copy of the values the module named as
possible. The shape of the answer SHALL come from the module's declared night
step. A module that returns `no-effect` SHALL yield no information.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The ability works

- **WHEN** a module answers for an owner who is sober and healthy
- **THEN** the engine returns the answer under the declared shape, asks the host nothing and offers no options

#### Scenario: The owner is impaired

- **WHEN** a module answers for a drunk or poisoned owner
- **THEN** the engine marks the answer impaired, asks the host and offers the values the module named, the true one among them

#### Scenario: The module names no possible answers

- **WHEN** a module answers for an impaired owner and names no possible values
- **THEN** the host is still asked, and the engine invents no list

#### Scenario: The role learns nothing

- **WHEN** a module returns `no-effect`
- **THEN** the step yields no information

#### Scenario: A module without the capability

- **WHEN** a module declares no `information` capability
- **THEN** the engine keeps its own path for that role

#### Scenario: The role reads facts, not the game

- **WHEN** the engine resolves the capability
- **THEN** the role is given its seat, the date of the night, the chosen targets, the living neighbours and the team each player registers as under the host's registrations
