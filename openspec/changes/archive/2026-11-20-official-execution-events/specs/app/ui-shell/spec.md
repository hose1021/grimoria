## MODIFIED Requirements

### Requirement: One execution decision with a preview

The day card and fixed dock SHALL share one execution target and survival
choice and preview consequences before applying the command. An existing
target SHALL be eligible whether alive or dead. The preview's pinned identity
SHALL be reused by the apply command.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Issue #171](https://github.com/hose1021/grimoria/issues/171)
**Tests**: `scripts/browser-check.ts`, `src/core/engine/commands.test.ts` "a corpse execution previews without mutation and applies once through commands"

#### Scenario: Dead target selected

- **WHEN** the host selects a dead player before the day's execution
- **THEN** the execution control is enabled and applies an execution without a new death

#### Scenario: Survival chosen

- **WHEN** the host ticks the survival control and executes
- **THEN** the dock sends the same survival value the day card shows and the consequence preview was visible before the click
