# Spec Delta

## ADDED Requirements

### Requirement: Setup board on the table

While the game is in its setup, deal or seat phase, `/table` SHALL show a setup
board instead of the table ring. The board SHALL name the four setup steps in
order — roles, names, seats, secrets — SHALL mark the current step and every
completed step with a text or shape cue, and SHALL offer exactly one primary
action for the current step.

**Source**: owner redesign request for the `/table` setup phase, 2026-11-18; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Roles step

- **WHEN** `/table` renders in the setup phase before roles are chosen
- **THEN** the board marks the roles step as current and its primary action opens
  `/bag`

#### Scenario: Names step

- **WHEN** the game is dealt and at least one player has not claimed a name
- **THEN** the board marks the names step as current and its primary action opens
  `/player`

#### Scenario: Seats step

- **WHEN** every player has claimed a name and the phase is still the deal phase
- **THEN** the board marks the seats step as current and its primary action opens
  `/seat`

#### Scenario: Secrets step

- **WHEN** the game is in the seat phase
- **THEN** the board marks the secrets step as current, offers the first-night
  action as its primary action, and keeps that action disabled while the secrets
  projection reports an error

### Requirement: Setup board seat roster

The board SHALL show one chip for every seat in the saved order, carrying the
seat number and either the claimed name or an unclaimed label. A claimed seat
SHALL also carry a claim mark, so the state reads without colour. The board
SHALL count claimed seats against the roster size and SHALL keep the
do-not-discuss-roles caution visible while roles are dealt.

**Source**: owner redesign request for the `/table` setup phase, 2026-11-18; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Mixed claims

- **WHEN** eight seats exist and three players have claimed names
- **THEN** the board shows eight chips in seat order, three names, five unclaimed
  labels and a count of three out of eight

#### Scenario: Long name

- **WHEN** a claimed name is longer than its chip
- **THEN** the chip truncates the name and the seat number stays readable

#### Scenario: Caution after the deal

- **WHEN** roles are dealt and the first night has not started
- **THEN** the board shows the do-not-discuss-roles caution

### Requirement: Setup board carries no secret

The setup board SHALL read only the seat order, the seat number, the claimed
name and the claim flag. It SHALL NOT show a role, a shown role, a team, a note
or any other secret, so the host can leave it open while the device is passed
to the players.

**Source**: `app/ui-and-privacy` "Public and player privacy"; owner redesign request for the `/table` setup phase, 2026-11-18
**Tests**: `scripts/browser-check.ts`

#### Scenario: Handoff exposure

- **WHEN** the device is handed to a player during the deal
- **THEN** the board shows no role, shown role, team or note for any seat

#### Scenario: Ready state

- **WHEN** the board passes through every setup step
- **THEN** no secret value from the game state reaches the board markup

### Requirement: Setup board fits a phone

At 360 to 390 px the setup board SHALL fit the stage width without horizontal
document scroll, SHALL keep every control at least 44x44 CSS pixels, and SHALL
scroll vertically inside the stage when its content is taller than the
viewport, leaving the app bar and the dock in place.

**Source**: owner redesign request for the `/table` setup phase, 2026-11-18; `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Phone fit

- **WHEN** `/table` renders the board at 360 and 390 px
- **THEN** the document has no horizontal overflow and every board control is at
  least 44 px tall

#### Scenario: Short viewport

- **WHEN** the board is taller than the stage at 360x640
- **THEN** the stage scrolls and the app bar and dock stay in place
