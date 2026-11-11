# Spec Delta

## ADDED Requirements

### Requirement: Trouble Brewing first-night pair information

The engine SHALL compute the Librarian and Investigator first-night
information from the real setup: a Librarian learns that one of two players is
a particular Outsider or that zero are in play, and an Investigator learns that
one of two players is a particular Minion.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983)
**Tests**: `js/engine.test.mjs`

#### Scenario: Librarian pair

- **WHEN** the first night resolves the Librarian step and an Outsider is in play
- **THEN** the shown role is that Outsider and the pair contains that player

#### Scenario: Librarian zero

- **WHEN** no Outsider is in play on the first night
- **THEN** the Librarian learns that zero are in play and no pair is required

#### Scenario: Investigator pair

- **WHEN** the first night resolves the Investigator step
- **THEN** the shown role is a Minion in play and the pair contains that player

### Requirement: False information for every impaired Trouble Brewing role

The engine SHALL offer a Storyteller override with allowed options for every
Trouble Brewing information role while that role is drunk or poisoned,
including a Librarian whose setup result is zero.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983), [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510), [Empath r1724](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=1724), [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123), [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125)
**Tests**: `js/engine.test.mjs`

#### Scenario: First-night role impaired

- **WHEN** a Washerwoman, Librarian, Investigator, Chef, Empath or Fortune Teller is impaired
- **THEN** the step requires a host choice and the options are the allowed results for that role

#### Scenario: Librarian with zero setup impaired

- **WHEN** a Librarian is impaired and the setup result is zero
- **THEN** the step still requires a false-information choice, does not claim that zero are in play, and offers a default pair

#### Scenario: Death-triggered role impaired

- **WHEN** an Undertaker or Ravenkeeper acts while impaired
- **THEN** the step offers any character as the false answer

### Requirement: Spy and Recluse registration

The engine SHALL apply Spy and Recluse registration overrides for alignment,
Demon, Minion, Townsfolk and Outsider queries, including for a dead Spy or
Recluse, and SHALL NOT treat a Recluse registered merely as evil as a Demon.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007)
**Tests**: `js/engine.test.mjs`

#### Scenario: Dead Recluse registration

- **WHEN** a dead Recluse is registered as evil, a Minion or a Demon
- **THEN** the matching alignment and role queries return that registration

#### Scenario: Evil is not Demon

- **WHEN** a Recluse is registered only as evil
- **THEN** a Demon query returns false

#### Scenario: Dead Spy registration

- **WHEN** a dead Spy is registered as good, a Townsfolk or an Outsider
- **THEN** the matching alignment and role queries return that registration

### Requirement: Spy grimoire step

The engine SHALL create a grimoire step for the Spy on every night the Spy
acts.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118)
**Tests**: `js/engine.test.mjs`

#### Scenario: Spy wakes

- **WHEN** the night queue includes the Spy
- **THEN** the step reports a grimoire result

### Requirement: Saint under impairment

The engine SHALL NOT declare an evil win when a Saint dies by execution while
drunk or poisoned.

**Source**: [Saint r3119](https://wiki.bloodontheclocktower.com/index.php?title=Saint&oldid=3119)
**Tests**: `js/engine.test.mjs`

#### Scenario: Poisoned Saint

- **WHEN** a poisoned Saint dies by execution
- **THEN** the death is recorded as impaired and no winner is declared by the Saint ability

### Requirement: Official Trouble Brewing night order

The engine SHALL build the first-night and other-night queues from the
official Trouble Brewing order and SHALL wake the Spy last.

**Source**: [Trouble Brewing r3128](https://wiki.bloodontheclocktower.com/index.php?title=Trouble_Brewing&oldid=3128), `docs/official/nightsheet.json`
**Tests**: `js/engine.test.mjs`

#### Scenario: First night

- **WHEN** the first-night queue is built
- **THEN** the steps follow the official first-night sequence and the Spy is last

#### Scenario: Other nights

- **WHEN** another-night queue is built
- **THEN** the steps follow the official other-night sequence

### Requirement: Nomination limits

The engine SHALL allow each living player to nominate at most once per day and
SHALL allow each player to be nominated at most once per day.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168)
**Tests**: `js/engine.test.mjs`

#### Scenario: Repeated nominator

- **WHEN** a player who already nominated tries to nominate again in the same day
- **THEN** the command is rejected with `error.13`

#### Scenario: Repeated nominee

- **WHEN** a player who was already nominated is nominated again in the same day
- **THEN** the command is rejected with `error.14`

#### Scenario: Dead nominator

- **WHEN** a dead player tries to nominate
- **THEN** the command is rejected with `error.11`

### Requirement: Trouble Brewing 5–15 end-to-end

The engine SHALL run a complete Trouble Brewing game from deal through a first
night, an execution and the next night at every player count from five to
fifteen.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), [Trouble Brewing r3128](https://wiki.bloodontheclocktower.com/index.php?title=Trouble_Brewing&oldid=3128)
**Tests**: `js/engine.test.mjs`

#### Scenario: Every supported count

- **WHEN** a printed Trouble Brewing preset bag is dealt at a count from five to fifteen
- **THEN** the secrets validate, the first night resolves, an execution is recorded, and the next night starts
