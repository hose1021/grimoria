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
**Tests**: `js/engine.test.mjs:198`, `js/engine.test.mjs:299`, `js/engine.test.mjs:806`, `js/engine.test.mjs:821`, `js/engine.test.mjs:832`, `js/engine.test.mjs:847`

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
**Tests**: `js/engine.test.mjs:241`, `js/engine.test.mjs:267`, `js/engine.test.mjs:625`, `js/engine.test.mjs:643`, `js/engine.test.mjs:668`, `js/engine.test.mjs:684`, `js/engine.test.mjs:701`, `js/engine.test.mjs:738`, `js/engine.test.mjs:755`

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
**Tests**: `js/engine.test.mjs:318`, `js/engine.test.mjs:335`, `js/engine.test.mjs:354`, `js/engine.test.mjs:770`, `js/engine.test.mjs:911`

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
**Tests**: `js/engine.test.mjs:371`, `js/engine.test.mjs:387`, `js/engine.test.mjs:401`, `js/engine.test.mjs:418`, `js/engine.test.mjs:856`, `js/engine.test.mjs:877`, `js/engine.test.mjs:945`, `js/engine.test.mjs:959`

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
**Tests**: `js/engine.test.mjs:153`, `js/engine.test.mjs:387`, `js/engine.test.mjs:788`

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
**Tests**: `js/engine.test.mjs:280`, `js/engine.test.mjs:897`, `js/engine.test.mjs:911`

#### Scenario: Killed before the wake

- **WHEN** a player dies earlier in the night than their own step
- **THEN** that step is not offered

#### Scenario: Promoted Minion

- **WHEN** a Spy becomes the Demon mid-night
- **THEN** the Spy grimoire step is dropped
