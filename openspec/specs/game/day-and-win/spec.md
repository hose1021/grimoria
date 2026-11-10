# Day and Win Specification

## Purpose

Defines execution, voting and the order in which the engine decides that a team
has won.

## Requirements

### Requirement: Execution threshold

The engine SHALL require at least half of the living players, rounded up, for
an execution.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310), `docs/rules-sources.md` "Interpretations" item 16
**Tests**: `js/engine.test.mjs:542`

#### Scenario: Six living players

- **WHEN** six players are alive
- **THEN** three votes are enough for an execution

#### Scenario: Seven living players

- **WHEN** seven players are alive
- **THEN** four votes are required

### Requirement: Dead vote token

The engine SHALL count a dead player's vote once and SHALL spend the token when
the vote is cast, including a failed nomination.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310)
**Tests**: `js/engine.test.mjs:431`

#### Scenario: Second dead vote

- **WHEN** a dead player votes a second time
- **THEN** the vote is not counted

### Requirement: Ties and execution outcome

The engine SHALL block an execution when the highest vote total is tied, SHALL
keep the leader when a lower total is tied, and SHALL record an execution event
that may produce no death.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310), `docs/rules-sources.md` "Interpretations" item 7
**Tests**: `js/engine.test.mjs:455`, `js/engine.test.mjs:475`

#### Scenario: Tied maximum

- **WHEN** two nominees share the maximum vote total
- **THEN** nobody is executed

#### Scenario: Execution without a death

- **WHEN** an execution event happens and the target does not die
- **THEN** the day records the execution and no death

### Requirement: Win precedence

The engine SHALL check wins in this order: Saint execution, Mastermind extra
day, Evil Twin and Vortox day end, Mayor three-player win, no living Demon, and
two living players; a dead Demon token SHALL not end the game before inheritance
is resolved.

**Source**: `docs/rules-sources.md` "Interpretations" item 20, [Saint r3119](https://wiki.bloodontheclocktower.com/index.php?title=Saint&oldid=3119), [Mastermind r2993](https://wiki.bloodontheclocktower.com/index.php?title=Mastermind&oldid=2993)
**Tests**: `js/engine.test.mjs:492`, `js/engine.test.mjs:516`, `js/engine.test.mjs:530`, `js/bmr.test.mjs:205`, `js/snv.test.mjs:119`, `js/snv.test.mjs:128`

#### Scenario: Saint executed

- **WHEN** a sober Saint dies by execution
- **THEN** evil wins

#### Scenario: No living Demon before two alive

- **WHEN** the last Demon is dead and two players remain
- **THEN** good wins by the Demon check, not the two-alive rule

### Requirement: Mayor three-player win

The engine SHALL give good the win at the end of a day with exactly three
living players and no execution event, and SHALL not grant it when an execution
happened or the Mayor was impaired.

**Source**: [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995)
**Tests**: `js/engine.test.mjs:492`, `js/engine.test.mjs:516`, `js/engine.test.mjs:721`

#### Scenario: Three living, no execution

- **WHEN** exactly three players live and the day ends with no execution event
- **THEN** good wins

#### Scenario: Attempted execution with no death

- **WHEN** an execution event happened but nobody died
- **THEN** the Mayor win does not trigger

### Requirement: Idempotent day actions

The engine SHALL reject a second application of a completed night step or a
recorded vote.

**Source**: `SPEC.md` "Domain rules"
**Tests**: `js/engine.test.mjs:565`

#### Scenario: Repeated vote

- **WHEN** the same vote command is applied twice
- **THEN** the second apply reports failure and does not change the tally
