## MODIFIED Requirements

### Requirement: Storyteller madness penalty

The engine SHALL apply a madness penalty only through a recorded Storyteller decision, SHALL accept only the legal penalties `execute` and `none`, SHALL require a non-empty reason, SHALL execute through the normal day execution path when the Storyteller chooses `execute`, and SHALL block ending the day while any active madness effect lacks a decision for that day. The engine SHALL allow a recorded `none` decision to be upgraded once to `execute` later that day when no execution has occurred, and SHALL reject repeated decisions except for that upgrade, repeated executions, and downgrading an execution. The engine SHALL not decide whether a player broke madness.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048), [Mutant r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Execution penalty

- **WHEN** the host applies `madnessPenalty` with `execute` and a reason
- **THEN** the mad player is executed for this day, the execution cause is
  `madness`, and the token stores the decision and its reason

#### Scenario: Declined penalty

- **WHEN** the host applies `madnessPenalty` with `none` and a reason
- **THEN** nobody dies, the token stores the decision and its reason, and the
  day continues

#### Scenario: Illegal penalty

- **WHEN** the penalty is not one of the legal options
- **THEN** the command returns a Storyteller choice with `execute` and `none`
  and the state is unchanged

#### Scenario: No active madness or no reason

- **WHEN** the player has no active madness or the reason is empty
- **THEN** the command is rejected and the state is unchanged

#### Scenario: A player has overlapping madness conditions

- **WHEN** the host reviews a player affected by both Mutant and Cerenovus madness
- **THEN** each `madnessPenalty` names its madness effect ID, records a separate
  decision and reason, and ending the day stays blocked until both are reviewed

#### Scenario: End of day requires madness review

- **WHEN** the Storyteller ends a day with an active Cerenovus or Mutant madness effect that has no decision for that day
- **THEN** the command is rejected without changing state and identifies the player whose madness needs review

#### Scenario: No penalty is recorded after review

- **WHEN** the Storyteller records `none` with a reason for each active madness effect
- **THEN** the day may end and the journal records the decisions

#### Scenario: New evidence changes the decision

- **WHEN** the Storyteller recorded `none` and later chooses `execute` for that same active madness effect before another execution
- **THEN** the execution is recorded through the normal path and the day ends

#### Scenario: Execution decision cannot be repeated or reversed

- **WHEN** the madness effect already caused an execution or the day already has an execution
- **THEN** another execution decision is rejected without changing state
