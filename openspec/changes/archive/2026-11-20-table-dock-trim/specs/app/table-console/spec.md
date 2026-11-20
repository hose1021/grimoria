# Spec Delta

## MODIFIED Requirements

### Requirement: Vote threshold and execution result

The day SHALL display the execution threshold, `ceil(living / 2)`, in the centre
hub. The host SHALL record the votes; the execution control SHALL be unavailable
below the threshold. The table SHALL dispatch the existing command for execution
and the centre SHALL show the executed player and role afterwards. The engine
SHALL remain the authority for whether an execution is allowed; the screen
SHALL NOT compute a rule outcome locally.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #258](https://github.com/hose1021/grimoria/issues/258); `game/day-and-win`; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`; `src/core/engine/commands.test.ts`

#### Scenario: Threshold

- **WHEN** a nomination is open with fifteen living players
- **THEN** the hub shows that eight votes are needed

#### Scenario: Host records votes

- **WHEN** the host records a vote
- **THEN** the vote total and the threshold progress update and the execution
  control becomes available only at the threshold

#### Scenario: Execution result

- **WHEN** the host executes the nominee
- **THEN** the centre shows the executed player and role and the day can be
  closed

### Requirement: Live nominations stay at the table

The day console SHALL offer exactly three actions: execute the selected player,
end the day without execution, and open day help. It SHALL NOT offer nomination
or vote entry. The vote threshold and an existing saved nomination SHALL stay
read-only. The day-help action SHALL show how many role forms the sheet
currently holds, and the dock SHALL NOT repeat the threshold or an execution
instruction the table already shows.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170), [Issue #258](https://github.com/hose1021/grimoria/issues/258); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`; `src/ui/screens/table/helpers.test.ts`

#### Scenario: Three day actions

- **WHEN** the day console renders
- **THEN** the dock shows execute, end day and day help, and no nomination or
  vote controls

#### Scenario: Day-help count

- **WHEN** the day holds one unused Virgin and no other role form
- **THEN** the day-help action reads one, and the sheet holds exactly that form

#### Scenario: Execution without app-side votes

- **WHEN** the host selects a living player and executes
- **THEN** the execution is recorded without entering a nomination or a vote
  list in the app

#### Scenario: Saved nomination stays read-only

- **WHEN** an imported or legacy save already carries a nomination
- **THEN** the hub shows it and its tally without offering an edit control
