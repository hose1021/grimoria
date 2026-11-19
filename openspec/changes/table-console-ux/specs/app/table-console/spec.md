# Spec Delta

## ADDED Requirements

### Requirement: Step action readiness

The dock's night action SHALL be unavailable while the current step lacks its
target, and its label SHALL name the missing input instead of opening a sheet
whose confirm control is disabled. When the secret setup is incomplete, the
action SHALL offer the route to that setup instead of a disabled control. A
blocker the step sheet itself answers (information, role, drunk choice,
redirect) SHALL leave the action available so the sheet stays reachable.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); `app/table-console` "Engine guidance and host safety"
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: Blocked step

- **WHEN** a targeting step has fewer targets than the engine requires
- **THEN** the dock action is disabled and its label says that a target is
  needed, and no sheet opens

#### Scenario: Ready step

- **WHEN** every required input for the step is present
- **THEN** the dock action opens the step sheet and the sheet can confirm

### Requirement: Vote entry commits on leave

The day player sheet SHALL record the vote count when the host leaves the number
field or presses Enter, SHALL NOT require a separate save control, and SHALL not
dispatch when the value is unchanged or invalid.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); `app/table-console` "Vote threshold and execution result"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Commit on blur

- **WHEN** the host types a valid count and leaves the field
- **THEN** the count is recorded and the field shows it as saved

#### Scenario: Invalid value

- **WHEN** the field holds an empty or out-of-range value
- **THEN** nothing is dispatched and the value stays editable

### Requirement: Execution confirmation

Execution SHALL require an explicit confirmation that names the player, seat
and role. The preview of the selected execution target SHALL read in the future
tense. The dock SHALL render one consequence preview per phase.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); [Issue #164](https://github.com/hose1021/grimoria/issues/164); `app/table-console` "Vote threshold and execution result"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Confirm before death

- **WHEN** the host activates the execution control with a selected player
- **THEN** a confirmation sheet names the player, the seat and the role, and the
  game state changes only after its confirm control

#### Scenario: Cancel

- **WHEN** the host closes the confirmation sheet
- **THEN** the player stays alive and the selected target stays selected

#### Scenario: Stale selection

- **WHEN** another execution is recorded after the confirmation sheet opens
- **THEN** confirming the outdated selection is rejected and no second player
  is executed

### Requirement: Wake order visibility

The table menu SHALL show the night queue: completed and total steps, the next
three wakes and the full order, with the current step marked. The dock SHALL
name the next wake while a night step is active.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); `app/table-console` "Two-second table read"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Next wake

- **WHEN** a night step is active
- **THEN** the dock names the next wake after the current step

#### Scenario: Full order

- **WHEN** the host opens the table menu during a night
- **THEN** the queue panel shows progress, the next three wakes and the order

### Requirement: Console text floor

Functional text the host reads under pressure on the console SHALL be at least
12 px: the phase chip, seat numbers, roster rows, journal title, filters and
entry details, and dock counters. Decorative micro-labels MAY stay smaller.

**Source**: [Issue #311](https://github.com/hose1021/grimoria/issues/311); `app/table-console` "Two-second table read"
**Tests**: `scripts/browser-check.ts`

#### Scenario: Phone console

- **WHEN** the console renders at 390 px
- **THEN** the phase chip, seat number, roster row and journal entry text render
  at 12 px or larger

## MODIFIED Requirements

### Requirement: Visible seats and role identity

Every seat SHALL show the player name and the seat number at 360 to 390 px, and
the role artwork on the medallion. The name label SHALL be part of the seat
control's hit area. The role text SHALL be available in the player list, the
step sheet and the player card. A seat SHALL be a keyboard-reachable control
with a target of at least 44x44 CSS pixels.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #311](https://github.com/hose1021/grimoria/issues/311); `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`

#### Scenario: Fifteen names at 390

- **WHEN** a fifteen-player table renders at 390 px
- **THEN** all fifteen player names and seat numbers are visible on the table

#### Scenario: Name tap

- **WHEN** the host taps a seat name during a target step
- **THEN** the seat selects the target

#### Scenario: Role artwork

- **WHEN** a seat renders
- **THEN** its role artwork identifies the role and the role text is available
  in the player list and the player card

#### Scenario: Seat target

- **WHEN** the host uses the table with a keyboard or a touch screen
- **THEN** every seat is reachable, named, and at least 44x44 CSS pixels

### Requirement: Table window composition

`/table` SHALL render one host table window with a top bar, a table area and a
fixed action dock. At 720 px and above the table SHALL fit the stage. Below
620 px the table MAY be taller than the viewport: the table area SHALL scroll
vertically while the top bar and the dock remain in place and usable, and the
document SHALL NOT scroll horizontally at 360 to 390 px. The stage SHALL reserve
space for the seat labels so the dock does not cover a name or seat number, and
the phase control SHALL live in the fixed bar or dock, not float over the
scrolling table.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #311](https://github.com/hose1021/grimoria/issues/311); `design/prototypes/05-velvet-ring.html`; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Desktop table

- **WHEN** `/table` renders at 1440x900
- **THEN** the table area fits the viewport and the dock stays below it

#### Scenario: Phone labels

- **WHEN** a fifteen-player table renders at 390 px
- **THEN** the stage scrolls but no seat name or seat number sits under the dock

#### Scenario: Phone scroll

- **WHEN** a fifteen-player table is taller than the viewport at 390 px
- **THEN** only the table area scrolls and the top bar and dock remain fixed

#### Scenario: No sideways scroll

- **WHEN** `/table` renders at 360 and 390 px
- **THEN** the document has no horizontal overflow

### Requirement: Engine guidance and host safety

The dock and the step sheet SHALL surface the engine's step guidance, the active
effects that touch the step, the mandatory decisions, the consequence preview,
the rejection reason and the Storyteller-choice reason required by
`app/ui-privacy`. The dock SHALL collapse an empty effect list and an empty
consequence preview into one short line rather than two labelled blocks. The
table SHALL dispatch the existing commands only. It SHALL warn before a
consequence the engine reports as prevented or special (protection, Soldier,
Mayor redirect, Saint execution) and SHALL NOT auto-fill a Storyteller choice.

**Source**: `app/ui-and-privacy` "Storyteller step explanation", "Consequence preview and separation", "Rejected command reason"; [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #311](https://github.com/hose1021/grimoria/issues/311)
**Tests**: `scripts/browser-check.ts`; `src/core/engine/commands.test.ts`

#### Scenario: Preview before confirm

- **WHEN** the host chooses a target and a consequence is pending
- **THEN** the dock shows the consequence before the host confirms

#### Scenario: Empty preview

- **WHEN** the step has no active effect and no consequence
- **THEN** the dock shows one short line and no empty labelled block

#### Scenario: Protected target

- **WHEN** the chosen target is protected from the current effect
- **THEN** the dock says the death or effect will be prevented before the host
  confirms

#### Scenario: Rejection

- **WHEN** the engine rejects a command
- **THEN** the console shows the reason and the game state does not change
