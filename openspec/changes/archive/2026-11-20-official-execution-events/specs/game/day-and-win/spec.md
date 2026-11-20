## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Host execution of an already dead player

The host execution action SHALL accept an existing dead target, record the
day's execution and close the day without another death. A second day
execution SHALL remain rejected. The table SHALL allow selecting a dead target.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039)
**Tests**: `src/core/engine/engine.test.ts` "official execution of a dead player records an event without another death"

#### Scenario: Dead target

- **WHEN** the host executes an already dead player before any day execution
- **THEN** the execution is recorded with no death reference and no additional death
- **AND** another execution that day is rejected
