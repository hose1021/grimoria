## ADDED Requirements

### Requirement: Fortune Teller information capability

The Fortune Teller role module SHALL declare its step through the `night-step`
capability for every night, with two players and the yes-or-no shape. Its
`information` capability SHALL answer yes when either chosen player is the red
herring or registers as a Demon, and SHALL name yes and no as the possible
answers. The engine's information and step completion paths SHALL NOT name the
Fortune Teller.

**Source**: [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/fortuneteller/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Fortune Teller chooses the Demon

- **WHEN** a healthy Fortune Teller's step is completed with the Demon among the two chosen players
- **THEN** the step stores yes as its answer, with no options, and the secret log holds one step line

#### Scenario: The Fortune Teller chooses the red herring

- **WHEN** the red herring is among the two chosen players and neither is a Demon
- **THEN** the answer is yes

#### Scenario: Neither player is a Demon or the red herring

- **WHEN** the two chosen players are a Minion and a good player who is not the red herring
- **THEN** the answer is no

#### Scenario: The Fortune Teller chooses a dead player or their own seat

- **WHEN** one of the chosen players is dead or is the Fortune Teller
- **THEN** the step is accepted and answered by the same rule

#### Scenario: The step needs two different players

- **WHEN** the step is sent with fewer than two players, the same player twice or a seat that does not exist
- **THEN** the engine refuses it with the error it returned before the move, and the game is as it was

#### Scenario: The host registers a Recluse as the Demon

- **WHEN** the step is completed with a sober and healthy Recluse registered as the Demon
- **THEN** the answer is yes, and the registration is journaled before the step line

#### Scenario: An impaired Fortune Teller waits for the host

- **WHEN** the Fortune Teller is drunk or poisoned, or is a Drunk shown the Fortune Teller, and the step is sent without an answer
- **THEN** the engine returns the question with yes and no as the options, and the game, the journal and the command stream are as they were

#### Scenario: The host answers for an impaired Fortune Teller

- **WHEN** the step is sent again with yes or no
- **THEN** the step stores that answer and is marked impaired, and the answer is journaled as false information after the step line

#### Scenario: Outcomes do not change

- **WHEN** the same Fortune Teller step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: An information role reads Demon registration and the red herring

The engine SHALL give an `information` capability two more read-only facts:
whether a player registers as a Demon to this ability, and which player is the
red herring. A Demon SHALL register as one, alive or dead. Another player
SHALL register as a Demon only when the host registered them so for this step
and the engine accepts that registration. The role SHALL NOT read the host's
registrations or the setup secrets.

**Source**: [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/fortuneteller/role.test.ts`

#### Scenario: A Demon registers as a Demon

- **WHEN** an information capability asks about a Demon, living or dead
- **THEN** the fact is true

#### Scenario: The host registered a Recluse as the Demon

- **WHEN** the step carries a Demon registration for a sober and healthy Recluse
- **THEN** the fact is true for the Recluse, and false without that registration

#### Scenario: A registration as evil only

- **WHEN** the host registered the Recluse as evil and not as the Demon
- **THEN** the fact is false for the Recluse

#### Scenario: The game has a red herring

- **WHEN** the setup named a red herring
- **THEN** the role is given that player's id, and no id when the game has none

### Requirement: The Fortune Teller query holds no rule

The engine's exported query `fortuneTellerYes` SHALL keep its signature and
SHALL answer by resolving the Fortune Teller module's `information` capability
with the engine's facts. The engine SHALL NOT hold a second copy of the rule.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The query is asked outside a step

- **WHEN** a caller asks what a Fortune Teller would hear for two players, with or without registrations
- **THEN** the answer is the one the role module gives for those players
