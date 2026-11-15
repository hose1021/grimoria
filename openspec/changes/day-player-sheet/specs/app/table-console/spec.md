# Spec Delta

## MODIFIED Requirements

### Requirement: Day help sheet

The day-help sheet SHALL contain only role-specific forms and SHALL NOT
duplicate the generic execution target, execution result or nomination controls
that the dock owns. Tapping a seat during the day SHALL open that player's
sheet, which may choose or clear the execution target; the dock SHALL remain
the only control that records the execution.

**Source**: [Issue #170](https://github.com/hose1021/grimoria/issues/170), [Issue #191](https://github.com/hose1021/grimoria/issues/191); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Virgin form

- **WHEN** the host opens the day-help sheet with the Virgin in play
- **THEN** the sheet shows the Virgin nomination form and no generic execution or
  nomination form

#### Scenario: Execution stays in the dock

- **WHEN** the host records an execution
- **THEN** the target was chosen in the player sheet, the dock control records it
  and the day-help sheet shows no execution control

#### Scenario: Day seat opens the sheet

- **WHEN** the host taps a seat during the day
- **THEN** the player sheet opens for that seat and offers select or clear for the
  execution target
