# Day and Win Specification

## Purpose

Defines execution, voting and the order in which the engine decides that a team
has won.

## Requirements

### Requirement: Execution threshold

The engine SHALL require at least half of the living players, rounded up, for
an execution.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310), `docs/rules-sources.md` "Interpretations" item 16
**Tests**: `src/core/engine/engine.test.ts`

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
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Second dead vote

- **WHEN** a dead player votes a second time
- **THEN** the vote is not counted

### Requirement: Ties and execution outcome

The engine SHALL block an execution when the highest vote total is tied, SHALL
keep the leader when a lower total is tied, and SHALL record an execution event
that may produce no death.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310), `docs/rules-sources.md` "Interpretations" item 7
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

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
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Saint executed

- **WHEN** a sober Saint dies by execution
- **THEN** evil wins

#### Scenario: No living Demon before two alive

- **WHEN** the last Demon is dead and two players remain
- **THEN** good wins by the Demon check, not the two-alive rule

### Requirement: Mayor three-player win

The engine SHALL give good the win at the end of a day with exactly three
living players and an unimpaired Mayor only when no execution event occurred.
An execution of a corpse or an execution that produced no death SHALL block
this win and SHALL satisfy the Vortox's requirement that someone be executed.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995), [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017)
**Tests**: `src/core/engine/engine.test.ts` "official execution without a death blocks the Mayor win at day end"; `src/core/engine/engine.test.ts` "official execution without a death satisfies the Vortox execution condition"

#### Scenario: Three living, no execution

- **WHEN** exactly three players live, the Mayor is healthy and no execution occurred
- **THEN** ending the day grants good the Mayor win

#### Scenario: Attempted execution with no death

- **WHEN** an execution was recorded but the target survived
- **THEN** the Mayor win does not trigger

#### Scenario: Corpse selection

- **WHEN** a corpse is executed and three players including a healthy Mayor remain alive
- **THEN** ending the day does not grant the Mayor win

#### Scenario: Execution death

- **WHEN** an execution produced a death that day
- **THEN** the Mayor win does not trigger

#### Scenario: Vortox day with a corpse execution

- **WHEN** the Vortox is healthy and alive and a corpse was executed that day
- **THEN** ending the day does not grant the Vortox win

### Requirement: Idempotent day actions

The engine SHALL reject a second application of a completed night step or a
recorded vote.

**Source**: `SPEC.md` "Domain rules"
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Repeated vote

- **WHEN** the same vote command is applied twice
- **THEN** the second apply reports failure and does not change the tally

### Requirement: Execution event

The engine SHALL record an execution for a living or a dead target, SHALL let a
dead target's execution produce no new death, SHALL spend the day's one
execution in either case, SHALL reject a second execution on the same day, and
SHALL keep the execution record for a living player whose death is prevented.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/commands.test.ts`, `src/core/engine/tb-audit.test.ts`

#### Scenario: Dead target

- **WHEN** the host executes a dead player
- **THEN** the execution is recorded, the day is spent, and no new death occurs

#### Scenario: Repeated execution

- **WHEN** the host executes a second player in the same day
- **THEN** the command is rejected and the first execution stands

#### Scenario: Prevented death

- **WHEN** a living player is executed and a protection prevents the death
- **THEN** the execution is recorded and the day has no execution death

### Requirement: Night start phase guard

The engine SHALL reject `startNight` while the game is in the day phase and
SHALL NOT rebuild the night queue or change the phase.

**Source**: `SPEC.md` "Domain actions"; [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Stale tab

- **WHEN** a command starts the night while the game is in the day phase
- **THEN** the command is rejected with `error.68` and the state is unchanged

### Requirement: Host execution of an already dead player

The host execution action SHALL accept an existing dead target, record the
day's execution and close the day without another death. A second day
execution SHALL remain rejected. The table SHALL allow selecting a dead target.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039)
**Tests**: `src/core/engine/engine.test.ts` "official execution of a dead player records an event without another death"

#### Scenario: Dead target

- **WHEN** the host records an execution of a player who is already dead before any day execution
- **THEN** the execution is recorded with no death reference and no additional death
- **AND** another execution that day is rejected

### Requirement: Manual aggregate votes and dead-vote bookkeeping

During an active day the engine SHALL accept a host-recorded vote count from
zero through roster size for an existing player, independently of nomination
records. It SHALL permit recording or correcting the spent token of a dead or
registered-dead player. Neither action SHALL infer voters, nominators or an
execution. Commands SHALL persist, replay and undo through the normal command
path; a new day SHALL clear tallies while preserving token state.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168), [Zombuul r3022](https://wiki.bloodontheclocktower.com/index.php?title=Zombuul&oldid=3022)
**Tests**: `src/core/engine/commands.test.ts`, `scripts/browser-check.ts`

#### Scenario: Record a total

- **WHEN** the host records five votes against a player
- **THEN** the tally is five and nominations, deaths, execution and tokens are unchanged

#### Scenario: Mark a dead vote

- **WHEN** the host marks a dead or registered-dead player's vote spent
- **THEN** that player's token is unavailable until corrected or normally restored

#### Scenario: Reject invalid bookkeeping

- **WHEN** a count is invalid, a player is unknown, or the day is unavailable
- **THEN** the action is rejected without mutation
