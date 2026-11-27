## ADDED Requirements

### Requirement: Mastermind extension preserves the intervening night

After a Demon execution triggers the Mastermind, the engine SHALL run the
ordinary night before the extra day. The dead Demon SHALL NOT act, other
eligible characters SHALL retain their night steps, and the extra day SHALL
begin at dawn. Execution of a player on that day SHALL make their team lose.

**Source**: [Mastermind r2993](https://wiki.bloodontheclocktower.com/index.php?title=Mastermind&oldid=2993)
**Tests**: `src/core/engine/bmr.test.ts` "official Mastermind extension includes the intervening night before its extra day"

#### Scenario: Night after the Demon execution

- **WHEN** the triggering day ends with an active Mastermind extension
- **THEN** the next phase is night and living characters retain their ordinary steps
- **AND** completing that night begins the extra day
