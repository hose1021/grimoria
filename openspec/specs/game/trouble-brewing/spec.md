# Trouble Brewing Specification

## Purpose

Defines the Trouble Brewing behaviors the engine resolves without host
adjudication: first-night and each-night information, protection from the
Demon, Demon succession, day abilities, registration and the Drunk mask.

## Requirements

### Requirement: Trouble Brewing information roles

The engine SHALL compute the Washerwoman, Librarian, Investigator, Chef, Empath,
Fortune Teller and Undertaker information from real seats, roles and
registrations, and SHALL expose only allowed Storyteller overrides.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510), [Empath r1724](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=1724), [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123), [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: First-night pair

- **WHEN** the first night resolves the Washerwoman step
- **THEN** the shown pair contains the real role and no pair without it validates

#### Scenario: Fortune Teller target choice

- **WHEN** the Fortune Teller may choose themself or a dead player
- **THEN** both choices are accepted

### Requirement: Demon protection and Mayor redirection

The engine SHALL stop a Demon attack on a Monk-protected or sober Soldier target,
SHALL ask for a Mayor redirect only when a sober Mayor would actually die, and
SHALL resolve a redirect to a dead, Soldier or Monk-protected player as no death.

**Source**: [Monk r3124](https://wiki.bloodontheclocktower.com/index.php?title=Monk&oldid=3124), [Soldier r3121](https://wiki.bloodontheclocktower.com/index.php?title=Soldier&oldid=3121), [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Protected target dies nowhere

- **WHEN** the Imp attacks a Mayor and the host redirects to a dead player
- **THEN** nobody dies and the Mayor stays alive

#### Scenario: Impaired abilities are not offered

- **WHEN** the Mayor is poisoned at the moment of the attack
- **THEN** the Mayor dies with no redirect prompt

### Requirement: Demon succession

The engine SHALL pass the Demon role to a sober Scarlet Woman only when at least
five players were alive immediately before the Demon died, SHALL pass the Imp's
self-kill to a living Minion below that threshold, and SHALL not let the new
Demon act again in the same night.

**Source**: [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117), [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Five living before the death

- **WHEN** the Demon dies with five players alive and a sober Scarlet Woman
- **THEN** the Scarlet Woman becomes the Demon

#### Scenario: Four living before the death

- **WHEN** the Demon dies with fewer than five players alive
- **THEN** the Scarlet Woman does not inherit

### Requirement: Day abilities

The engine SHALL spend the Virgin's first nomination even when it does not
trigger, SHALL execute only an eligible Townsfolk nominator, SHALL spend the
Slayer ability when used while impaired without a kill, and SHALL count an
illegal Butler vote with a private warning.

**Source**: [Virgin r1729](https://wiki.bloodontheclocktower.com/index.php?title=Virgin&oldid=1729), [Slayer r3122](https://wiki.bloodontheclocktower.com/index.php?title=Slayer&oldid=3122), [Butler r3120](https://wiki.bloodontheclocktower.com/index.php?title=Butler&oldid=3120)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Drunk nominator

- **WHEN** a Drunk nominates the Virgin for the first time
- **THEN** the nomination spends the ability and nobody is executed

#### Scenario: Impaired Slayer

- **WHEN** a poisoned Slayer chooses the Demon
- **THEN** the ability is spent and the Demon survives

### Requirement: Registration and the Drunk mask

The engine SHALL treat Spy and Recluse registration as an explicit host choice
for each query, SHALL wake the Drunk under the shown role, and SHALL keep the
Drunk's real role out of Demon bluffs and public views.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Chef registration

- **WHEN** the host registers the Recluse as evil
- **THEN** the Chef count includes the adjacent evil pair

#### Scenario: Drunk wake

- **WHEN** the Drunk is shown the Washerwoman
- **THEN** the Washerwoman step wakes and the ability never works

### Requirement: Night queue skips unavailable actors

The engine SHALL skip a player killed before their wake, SHALL insert the
Ravenkeeper step only after a night death, and SHALL drop the old role step of a
Minion promoted to Demon during the night.

**Source**: [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125), `docs/rules-sources.md` "Interpretations" item 18
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Killed before the wake

- **WHEN** a player dies earlier in the night than their own step
- **THEN** that step is not offered

#### Scenario: Promoted Minion

- **WHEN** a Spy becomes the Demon mid-night
- **THEN** the Spy grimoire step is dropped

### Requirement: Trouble Brewing first-night pair information

The engine SHALL compute the Librarian and Investigator first-night
information from the real setup: a Librarian learns that one of two players is
a particular Outsider or that zero are in play, and an Investigator learns that
one of two players is a particular Minion.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983)
**Tests**: `src/core/engine/engine.test.ts`

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
**Tests**: `src/core/engine/engine.test.ts`

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
**Tests**: `src/core/engine/engine.test.ts`

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
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Spy wakes

- **WHEN** the night queue includes the Spy
- **THEN** the step reports a grimoire result

### Requirement: Saint under impairment

The engine SHALL NOT declare an evil win when a Saint dies by execution while
drunk or poisoned.

**Source**: [Saint r3119](https://wiki.bloodontheclocktower.com/index.php?title=Saint&oldid=3119)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Poisoned Saint

- **WHEN** a poisoned Saint dies by execution
- **THEN** the death is recorded as impaired and no winner is declared by the Saint ability

### Requirement: Official Trouble Brewing night order

The engine SHALL build the first-night and other-night queues from the
official Trouble Brewing order and SHALL wake the Spy last.

**Source**: [Trouble Brewing r3128](https://wiki.bloodontheclocktower.com/index.php?title=Trouble_Brewing&oldid=3128), `docs/official/nightsheet.json`
**Tests**: `src/core/engine/engine.test.ts`

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
**Tests**: `src/core/engine/engine.test.ts`

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
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Every supported count

- **WHEN** a printed Trouble Brewing preset bag is dealt at a count from five to fifteen
- **THEN** the secrets validate, the first night resolves, an execution is recorded, and the next night starts
