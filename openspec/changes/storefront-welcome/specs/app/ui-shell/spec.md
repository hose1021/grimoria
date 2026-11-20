# Spec Delta

## ADDED Requirements

### Requirement: Welcome page

`/` SHALL render the welcome page without changing the saved game. It SHALL show
one yellow primary action that opens a new game, a secondary continue action when
a game is in progress, a shelf of five real first-night roles with one struck
role, the three scripts as staff picks, an offline fact and a no-account fact.
The shelf SHALL be labelled as a sample.

**Source**: `PRODUCT.md`; issue #384
**Tests**: `scripts/browser-check.ts`

#### Scenario: One action

- **WHEN** `/` renders with no game in progress
- **THEN** exactly one control uses the rental-yellow primary treatment and it
  opens `/bag`

#### Scenario: Continue

- **WHEN** a saved game is past setup
- **THEN** the page offers the continue action into `/table`

#### Scenario: Sample shelf

- **WHEN** the page renders
- **THEN** the shelf shows five first-night role names and one struck role, and
  the sample note is visible

#### Scenario: No write

- **WHEN** the welcome page mounts and unmounts
- **THEN** no command is dispatched and `pg.game.v4` is unchanged

### Requirement: Step sheet close control

The night step sheet and the heir sheet SHALL render a visible close control that
dismisses the sheet without completing the step. Escape and a backdrop press
SHALL keep closing the sheet.

**Source**: issue #384
**Tests**: `scripts/browser-check.ts`

#### Scenario: Visible close

- **WHEN** the night step sheet is open at 390 CSS pixels
- **THEN** a close control is visible inside the dialog

#### Scenario: Dismiss without completing

- **WHEN** the close control is activated
- **THEN** the dialog closes and the step stays incomplete

## MODIFIED Requirements

### Requirement: Mobile app bar menu

Below 1200 CSS pixels the app bar SHALL replace its inline route list with one
menu toggle. The toggle SHALL expose `aria-expanded` and SHALL control one panel
that contains the seven route links, Help and the language switch. At 1200 CSS
pixels and above the same links, Help and the language control SHALL render
inline and no toggle SHALL render.

**Source**: `SPEC.md` "CSS and accessibility"; issues #141 and #384
**Tests**: `scripts/browser-check.ts`

#### Scenario: Closed on a phone

- **WHEN** `/table` opens at 390 CSS pixels
- **THEN** the toggle is visible with `aria-expanded="false"` and the route links
  are not visible

#### Scenario: Open on a phone

- **WHEN** the toggle is activated
- **THEN** it reports `aria-expanded="true"` and the seven route links, Help and
  the language switch are visible

#### Scenario: Desktop inline navigation

- **WHEN** a route opens at 1280 CSS pixels
- **THEN** the route links, Help and the language switch render inline in the app
  bar and no toggle renders

#### Scenario: Phone width

- **WHEN** the panel is open at 360 CSS pixels
- **THEN** the panel stays inside the viewport

### Requirement: Setup routes open without a cover

After `/player`, `/bag`, `/seat`, `/secrets` and `/table` SHALL render directly.
The shell SHALL NOT place a cover screen, a warning step or an extra confirmation
between the handoff and a setup route, and SHALL NOT place one between the
handoff and the console.

**Source**: `SPEC.md` "Screens" (`/player`); issues #142, #150 and #384
**Tests**: `scripts/browser-check.ts`

#### Scenario: Player handoff to the bag

- **WHEN** the player handoff opens `/bag` after `/player`
- **THEN** the bag renders without a cover heading or a return control

#### Scenario: Browser back from the handoff

- **WHEN** the browser back button returns from `/player` to `/bag`
- **THEN** the bag renders without a cover heading or a return control

#### Scenario: Table overlay unchanged

- **WHEN** `/table` opens after `/player`
- **THEN** the console renders without a cover heading, a warning step or a
  reveal control, and the setup routes keep their uncovered rendering

### Requirement: Console opens directly after a private route

`/table` SHALL render the console immediately when it opens after `/player`.
The console SHALL expose no hide control, no cover screen, no reveal control and
no warning step, and the route SHALL open no overlay of its own. Mounting the
console SHALL NOT dispatch a command or change the saved game.

**Source**: `SPEC.md` "Screens" (`/table`); issues #150 and #384
**Tests**: `scripts/browser-check.ts`

#### Scenario: Host returns from the player handoff

- **WHEN** the host leaves `/player` for `/table`
- **THEN** the console shows the phase card, and no `[data-act="hide"]`,
  `[data-act="reveal"]` or `[aria-modal="true"]` element exists

#### Scenario: Return from the public screen

- **WHEN** `/public` is opened
- **THEN** the unknown-path fallback renders `/table` without an intermediate
  cover and the grimoire controls are usable immediately

#### Scenario: Saved game unchanged

- **WHEN** a private route opens `/table`
- **THEN** the saved game and its revision are the same as before the route
  change

### Requirement: Mobile console composition

Below 900 pixels the console SHALL render the seat table before the controls and
the event log. The top navigation SHALL keep the home, table, player, setup,
seat, secrets, role sheet and help routes reachable, and no fixed footer dock
SHALL render. The document SHALL not scroll horizontally at 360 or 390 pixels.

**Source**: `SPEC.md` "CSS and accessibility"; issues #45 and #384
**Tests**: `scripts/browser-check.ts`

#### Scenario: Table first

- **WHEN** the console opens at 390 pixels
- **THEN** the table renders above the controls and the log

#### Scenario: Routes reachable

- **WHEN** the host uses the phone navigation
- **THEN** home, table, player, setup, seats, secrets, role sheet and help can
  each be opened

#### Scenario: No fixed dock

- **WHEN** the console renders at 390 pixels
- **THEN** no fixed footer navigation is present
