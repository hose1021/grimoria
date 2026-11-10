# Setup Specification

## Purpose

Defines how a game's player count becomes a legal bag: the official composition
table, scenario setup modifiers, secret masks, bluffs, validation and the
suggested bags the host can pick from.

## Requirements

### Requirement: Exact player-count composition

The setup SHALL produce the official team composition for 5 to 15 players and
SHALL apply the Baron's shift of two Townsfolk to two Outsiders.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), [Baron r2961](https://wiki.bloodontheclocktower.com/index.php?title=Baron&oldid=2961)
**Tests**: `js/engine.test.mjs:102`, `js/presets.test.mjs:146`

#### Scenario: Seven players

- **WHEN** the host selects 7 players on a Trouble Brewing game
- **THEN** the bag contains 5 Townsfolk, 0 Outsiders, 1 Minion and 1 Demon

#### Scenario: Baron at five players

- **WHEN** the bag contains the Baron at 5 players
- **THEN** the bag contains 1 Townsfolk, 2 Outsiders, 1 Minion and 1 Demon

### Requirement: Scenario setup modifiers

The setup SHALL apply the Godfather's plus-or-minus one Outsider choice, the
Fang Gu's plus one Outsider and the Vigormortis's minus one Outsider, and SHALL
reject a modifier that cannot be satisfied.

**Source**: [Godfather r2394](https://wiki.bloodontheclocktower.com/index.php?title=Godfather&oldid=2394), [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974), [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015)
**Tests**: `js/bmr.test.mjs:114`, `js/snv.test.mjs:86`

#### Scenario: Impossible Godfather shift

- **WHEN** the host sets the Godfather to minus one Outsider and the base composition has no Outsider
- **THEN** bag validation reports the impossible choice

#### Scenario: Vigormortis shift

- **WHEN** the Vigormortis is in play
- **THEN** the bag removes one Outsider and rejects a negative Outsider count

### Requirement: Legal bag validation

Bag validation SHALL reject duplicate roles, a wrong total, roles outside the
selected script, a bluff that is in play, and a Drunk shown role that leaks the
mask; a randomly generated bag SHALL be legal at every supported player count.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), `docs/rules-sources.md` "Setup and composition"
**Tests**: `js/engine.test.mjs:120`, `js/engine.test.mjs:144`, `js/bmr.test.mjs:103`, `js/snv.test.mjs:78`

#### Scenario: Duplicate role

- **WHEN** a five-player bag lists the Chef twice
- **THEN** bag validation fails

#### Scenario: Bluff that is in play

- **WHEN** a bluff role is also in the bag
- **THEN** bag validation fails

### Requirement: Bluffs and secret masks

The setup SHALL offer three distinct good roles not in play as Demon bluffs at
seven or more players, SHALL offer none at five or six players, and SHALL keep
the Drunk and Lunatic shown roles out of the bluff pool.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)
**Tests**: `js/engine.test.mjs:175`, `js/presets.test.mjs:53`, `js/presets.test.mjs:138`

#### Scenario: Five-player game

- **WHEN** the game has 5 players
- **THEN** the setup offers no bluffs and no evil-team introduction

#### Scenario: Drunk mask exclusion

- **WHEN** the bag contains a Drunk whose shown role is the Washerwoman
- **THEN** the Washerwoman cannot be a Demon bluff

### Requirement: Suggested bags

The setup SHALL provide three curated bags for every count from 5 to 15 in each
of the three official scenarios and SHALL generate three distinct deterministic
suggestions from a custom pool; a legal bag is not advertised as balanced.

**Source**: `SPEC.md` `/bag` and "Scenarios"; `docs/rules-sources.md` "Known limitations"
**Tests**: `js/presets.test.mjs:12`, `js/presets.test.mjs:29`, `js/presets.test.mjs:70`, `js/presets.test.mjs:90`

#### Scenario: Official preset validation

- **WHEN** all 99 official presets are validated
- **THEN** every preset has the exact count, pool membership and team composition

#### Scenario: Deterministic custom suggestions

- **WHEN** the host requests suggestions twice for the same count and pool
- **THEN** both calls return the same bags
