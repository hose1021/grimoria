## ADDED Requirements

### Requirement: Clockmaker information capability

The Clockmaker role module SHALL declare its first-night step through
`night-step` and SHALL answer through an `information` capability with
`infoKind: "clockmaker"`. The answer SHALL be the circular seat distance from
the Demon to its nearest Minion in play, alive or dead, zero when either is
absent, and SHALL name every number from 0 to the seat count as possible. The
engine SHALL NOT hold a second copy of the distance.

**Source**: [Clockmaker r2967](https://wiki.bloodontheclocktower.com/index.php?title=Clockmaker&oldid=2967), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168) "In play"; `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/clockmaker/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: The Clockmaker learns the distance

- **WHEN** a healthy Clockmaker's step is completed and the Demon and its nearest Minion are a number of seats apart
- **THEN** the step stores that distance as its answer, with no options, and the secret log holds one step line

#### Scenario: The ring closes and the nearest Minion wins

- **WHEN** the nearest Minion is reached around the last seat and the first, or two Minions stand at different distances
- **THEN** the value is the smallest circular distance

#### Scenario: A dead Minion or Demon is still in play

- **WHEN** the nearest Minion or the Demon has died but stays in the roster
- **THEN** the distance still ends at that character

#### Scenario: The Clockmaker wakes once

- **WHEN** a later night starts
- **THEN** the night has no Clockmaker step

### Requirement: Oracle information capability

The Oracle role module SHALL declare its step through `night-step` for every
night after the first and SHALL answer through an `information` capability
with `infoKind: "oracle"`. The answer SHALL be the number of dead players
whose team is evil on the current roster, not the number of deaths, and SHALL
name every number from 0 to the seat count as possible. The engine SHALL NOT
hold a second copy of the count.

**Source**: [Oracle r2909](https://wiki.bloodontheclocktower.com/index.php?title=Oracle&oldid=2909); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/oracle/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: The Oracle learns the count

- **WHEN** a healthy Oracle's step is completed
- **THEN** the step stores the number of dead evil players as its answer, with no options, and the secret log holds one step line

#### Scenario: Dead good players and the living are not counted

- **WHEN** good players are dead or an evil player is alive
- **THEN** they do not raise the count

#### Scenario: A resurrection leaves no dead player

- **WHEN** a counted player is alive again
- **THEN** the player is not counted, although the death record remains

#### Scenario: The Oracle does not wake on the first night

- **WHEN** the first night starts
- **THEN** the night has no Oracle step

### Requirement: An information role can tell which seats are alive

The engine SHALL give an `information` capability, beside the seats in order
around the circle, whether a named seat is alive now. A seat that is not in the
game SHALL answer false. The capability SHALL NOT reach the game state.

**Source**: [Oracle r2909](https://wiki.bloodontheclocktower.com/index.php?title=Oracle&oldid=2909); `docs/adr/0002-engine-contracts.md` §4; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A living and a dead seat

- **WHEN** a capability asks about a seat whose player is alive and one whose player is dead
- **THEN** the answer is true and false respectively

#### Scenario: A seat that does not exist

- **WHEN** the capability asks about a player not in the game
- **THEN** the answer is false

### Requirement: The information facts stay one implementation

The shared registration and context builders SHALL live in one engine module
that both the information dispatcher and the Sects & Violets answer factory
read. The dispatcher SHALL re-export the public builders so existing imports
keep resolving, and the Sects & Violets path SHALL NOT import the dispatcher.
A role module SHALL NOT import the engine.

**Source**: `docs/adr/0002-engine-contracts.md` §3; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/architecture.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The dispatcher and the answer factory share the facts

- **WHEN** the information dispatcher and the Sects & Violets answer factory build a context
- **THEN** they read the one implementation in `information-facts.ts`, the dispatcher re-exports its public builders, and the role modules stay free of engine imports

### Requirement: The Clockmaker and Oracle keep the shared answer wrapper

The Clockmaker and Oracle SHALL return the true value and the full possible
set whether or not their owner is impaired, and SHALL NOT mark an answer as
false. The engine SHALL keep the impairment flag, the living-Vortox rule, the
answer options, the suffixes, the text key, the text and the stored record
unchanged. An impaired owner SHALL still be offered the true value; a living,
unimpaired Vortox SHALL remove it. An impaired owner beside a living Vortox
SHALL keep the Vortox options and flags.

**Source**: [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/engine/cross-role.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: An impaired owner may still receive the truth

- **WHEN** the Clockmaker or Oracle is drunk or poisoned
- **THEN** the host is asked, the true value stays among the options, and `mayBeFalseSuffix` is true

#### Scenario: A living Vortox forbids the truth

- **WHEN** a living, unimpaired Vortox is in play
- **THEN** the options exclude the true value, `falsifiedSuffix` is true and `mayBeFalseSuffix` is false

#### Scenario: Both at once

- **WHEN** the owner is impaired and a living Vortox is in play
- **THEN** the options exclude the true value and the Vortox flags are kept

#### Scenario: The host's answer is journaled in secret

- **WHEN** an impaired owner's answer is applied
- **THEN** the secret log holds a `false-information` case and the public view omits the answer

#### Scenario: The stored record is unchanged

- **WHEN** the same Clockmaker or Oracle step is completed before and after the move
- **THEN** the step, the `given` record, the text and variables, the log lines, the command events and the command result are identical
