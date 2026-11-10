# Bad Moon Rising Specification

## Purpose

Defines the Bad Moon Rising behaviors the engine owns while the Storyteller
adjudicates printed abilities: official order, setup choices, protection order,
death recording, conditional wakes and the Mastermind extra day.

## Requirements

### Requirement: Official order and setup

The engine SHALL use the official Bad Moon Rising roster, composition and night
order, SHALL apply the Godfather's plus-or-minus one Outsider setting and SHALL
store the Lunatic's shown Demon.

**Source**: [Bad Moon Rising r2871](https://wiki.bloodontheclocktower.com/index.php?title=Bad_Moon_Rising&oldid=2871), [Godfather r2394](https://wiki.bloodontheclocktower.com/index.php?title=Godfather&oldid=2394), [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112)
**Tests**: `js/bmr.test.mjs:82`, `js/bmr.test.mjs:114`, `js/bmr.test.mjs:128`

#### Scenario: Roster and order

- **WHEN** a Bad Moon Rising game starts
- **THEN** the roster has 25 roles and the first night follows the official order

#### Scenario: Lunatic mask

- **WHEN** the Lunatic is in play
- **THEN** the setup stores a shown Demon and the real Demon learns the Lunatic

### Requirement: Death prevention and bypass

The engine SHALL resolve protection deterministically: the Assassin bypasses
Fool, Sailor, Tea Lady, Innkeeper and Devil's Advocate protection; the Zombuul
replaces its first death and registers as dead while sober; an impaired
Zombuul dies normally.

**Source**: [Assassin r1786](https://wiki.bloodontheclocktower.com/index.php?title=Assassin&oldid=1786), [Fool r2636](https://wiki.bloodontheclocktower.com/index.php?title=Fool&oldid=2636), [Zombuul r3022](https://wiki.bloodontheclocktower.com/index.php?title=Zombuul&oldid=3022)
**Tests**: `js/bmr.test.mjs:175`, `js/bmr.test.mjs:190`, `js/bmr.test.mjs:394`, `js/bmr.test.mjs:406`

#### Scenario: Assassin against the Fool

- **WHEN** the Assassin chooses the Fool
- **THEN** the Fool dies

#### Scenario: Impaired Zombuul

- **WHEN** a poisoned Zombuul dies for the first time
- **THEN** it dies and does not register as dead

### Requirement: Target ranges and conditional wakes

The engine SHALL enforce each step's target range, SHALL let the Po choose three
targets only after a night with no choice, SHALL skip a chosen Demon's wake for
the Exorcist, and SHALL resurrect only a dead Townsfolk for the Professor.

**Source**: [Po r3104](https://wiki.bloodontheclocktower.com/index.php?title=Po&oldid=3104), [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973), [Professor r1775](https://wiki.bloodontheclocktower.com/index.php?title=Professor&oldid=1775)
**Tests**: `js/bmr.test.mjs:142`, `js/bmr.test.mjs:155`, `js/bmr.test.mjs:237`, `js/bmr.test.mjs:298`

#### Scenario: Po after an empty night

- **WHEN** the Po chose no target on the previous night
- **THEN** the next Po step requires exactly three targets

#### Scenario: Exorcist target

- **WHEN** the Exorcist chooses the Demon
- **THEN** the Demon does not wake that night

### Requirement: Conditional information and day triggers

The engine SHALL schedule the Gossip kill only after a true statement, SHALL
accept the Moonchild's choice only from a living player, SHALL kill the
Grandmother when the Demon kills the grandchild, SHALL make everyone except the
Minstrel drunk after a Minion execution, and SHALL extend the game by one day
after a Demon execution when the Mastermind is in play.

**Source**: [Gossip r1773](https://wiki.bloodontheclocktower.com/index.php?title=Gossip&oldid=1773), [Moonchild r1783](https://wiki.bloodontheclocktower.com/index.php?title=Moonchild&oldid=1783), [Grandmother r2978](https://wiki.bloodontheclocktower.com/index.php?title=Grandmother&oldid=2978), [Minstrel r2600](https://wiki.bloodontheclocktower.com/index.php?title=Minstrel&oldid=2600), [Mastermind r2993](https://wiki.bloodontheclocktower.com/index.php?title=Mastermind&oldid=2993)
**Tests**: `js/bmr.test.mjs:224`, `js/bmr.test.mjs:268`, `js/bmr.test.mjs:285`, `js/bmr.test.mjs:312`, `js/bmr.test.mjs:205`

#### Scenario: Gossip statement

- **WHEN** the host records the Gossip statement as true
- **THEN** the next night queues one death step

#### Scenario: Mastermind extra day

- **WHEN** the Demon dies by execution with the Mastermind in play
- **THEN** the game continues for one more day

### Requirement: Tea Lady neighbours

The engine SHALL protect the nearest living neighbours while both are good,
SHALL skip dead seats, and SHALL not protect when a living neighbour is evil.

**Source**: [Tea Lady r1777](https://wiki.bloodontheclocktower.com/index.php?title=Tea_Lady&oldid=1777)
**Tests**: `js/bmr.test.mjs:341`, `js/bmr.test.mjs:353`, `js/bmr.test.mjs:365`

#### Scenario: Dead seat between neighbours

- **WHEN** a seat between the Tea Lady and a good player is dead
- **THEN** the nearest living neighbour is protected

### Requirement: Sailor safety

The engine SHALL prevent the Sailor's death while sober and healthy and SHALL
allow it while poisoned or drunk.

**Source**: [Sailor r1768](https://wiki.bloodontheclocktower.com/index.php?title=Sailor&oldid=1768)
**Tests**: `js/bmr.test.mjs:375`

#### Scenario: Impaired Sailor

- **WHEN** the Sailor is drunk when attacked
- **THEN** the Sailor dies
