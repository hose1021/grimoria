# Sects and Violets Specification

## Purpose

Defines the Sects and Violets behaviors the engine owns: official order and
composition, Evil Twin and Vortox win conditions, the Witch curse, Fang Gu
succession and No Dashii poison.

## Requirements

### Requirement: Official roster, order and composition

The engine SHALL use the official Sects and Violets roster, composition and
night order, SHALL apply the Fang Gu's plus one Outsider and the Vigormortis's
minus one Outsider, and SHALL reject an impossible shift.

**Source**: [Sects & Violets r3127](https://wiki.bloodontheclocktower.com/index.php?title=Sects_%26_Violets&oldid=3127), [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974), [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015)
**Tests**: `js/snv.test.mjs:59`, `js/snv.test.mjs:78`, `js/snv.test.mjs:86`, `js/snv.test.mjs:96`

#### Scenario: First night

- **WHEN** an Sects and Violets game starts
- **THEN** the first night follows the official order and validates

#### Scenario: Vigormortis without an Outsider

- **WHEN** the bag has no Outsider and the Vigormortis shift is selected
- **THEN** bag validation reports the impossible choice

### Requirement: Evil Twin setup and win

The engine SHALL require a good Evil Twin, SHALL give evil the win when the good
twin is executed, and SHALL keep good from winning while both twins live.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101)
**Tests**: `js/snv.test.mjs:119`, `js/snv.test.mjs:251`

#### Scenario: Good twin executed

- **WHEN** the good Evil Twin dies by execution
- **THEN** evil wins

#### Scenario: Missing good twin

- **WHEN** the setup has no good twin selected
- **THEN** setup validation reports the error

### Requirement: Vortox no-execution win

The engine SHALL give evil the win when the Vortox is in play and the day ends
without an execution event.

**Source**: [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017)
**Tests**: `js/snv.test.mjs:128`

#### Scenario: Day without execution

- **WHEN** the Vortox is in play and the host ends the day with no execution
- **THEN** evil wins

### Requirement: Witch curse

The engine SHALL curse the chosen player and kill that player when they
nominate on the following day while keeping the nomination, SHALL stop cursing
at three living players, and SHALL not curse when the Witch is dead or impaired.

**Source**: [Witch r2682](https://wiki.bloodontheclocktower.com/index.php?title=Witch&oldid=2682)
**Tests**: `js/snv.test.mjs:137`, `js/snv.test.mjs:162`

#### Scenario: Cursed nomination

- **WHEN** the cursed player nominates
- **THEN** the nominator dies and the nomination continues

#### Scenario: Impaired Witch

- **WHEN** the Witch is dead or poisoned at the night step
- **THEN** no curse is applied

### Requirement: Fang Gu succession

The engine SHALL let the first Outsider killed by the Fang Gu become an evil
Fang Gu while the old Demon dies, SHALL limit the jump to once per game, and
SHALL keep the limit through save, export, import, redeal and bag reset.

**Source**: [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974)
**Tests**: `js/snv.test.mjs:187`, `js/snv.test.mjs:269`, `js/snv.test.mjs:308`, `js/snv.test.mjs:327`, `js/snv.test.mjs:352`, `js/snv.test.mjs:376`, `js/snv.test.mjs:393`

#### Scenario: First Outsider death

- **WHEN** the Fang Gu kills an Outsider for the first time
- **THEN** that Outsider becomes an evil Fang Gu and the old Demon dies

#### Scenario: Second Outsider death

- **WHEN** the Fang Gu kills an Outsider after the jump already happened
- **THEN** the Outsider dies as normal

#### Scenario: Legacy save

- **WHEN** a save has the old per-player Fang Gu marker and no game-scoped flag
- **THEN** the once-per-game limit is still honored

### Requirement: No Dashii poison

The engine SHALL poison the nearest Townsfolk neighbours by character, including
dead seats, and SHALL reconcile the poison when the source or a target changes
character or the source loses the ability.

**Source**: [No Dashii r3158](https://wiki.bloodontheclocktower.com/index.php?title=No_Dashii&oldid=3158)
**Tests**: `js/snv.test.mjs:204`, `js/snv.test.mjs:217`

#### Scenario: Dead Townsfolk neighbour

- **WHEN** the nearest Townsfolk seat is dead
- **THEN** that player is still poisoned

### Requirement: Clockmaker information

The engine SHALL compute the shortest seat distance from the Demon to the
nearest Minion.

**Source**: [Clockmaker r2967](https://wiki.bloodontheclocktower.com/index.php?title=Clockmaker&oldid=2967)
**Tests**: `js/snv.test.mjs:110`

#### Scenario: Distance around the ring

- **WHEN** the Clockmaker wakes
- **THEN** the reported number is the shortest distance in either direction
