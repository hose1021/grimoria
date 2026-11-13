# Spec Delta

## ADDED Requirements

### Requirement: Mobile app bar menu

Below 900 CSS pixels the app bar SHALL replace its inline route list with one
menu toggle. The toggle SHALL expose `aria-expanded` and SHALL control one panel
that contains the seven route links, Help and the language switch. At 900 CSS
pixels and above the same links, Help and the language control SHALL render
inline and no toggle SHALL render.

**Source**: `SPEC.md` "CSS and accessibility"; issue #141
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Closed on a phone

- **WHEN** `/table` opens at 390 CSS pixels
- **THEN** the toggle is visible with `aria-expanded="false"` and the route links
  are not visible

#### Scenario: Open on a phone

- **WHEN** the toggle is activated
- **THEN** it reports `aria-expanded="true"` and the seven route links, Help and
  the language switch are visible

#### Scenario: Desktop inline navigation

- **WHEN** a route opens at 1440 CSS pixels
- **THEN** the route links, Help and the language switch render inline in the app
  bar and no toggle renders

#### Scenario: Phone width

- **WHEN** the panel is open at 360 CSS pixels
- **THEN** the document does not scroll horizontally and every item is at least
  44 pixels high

### Requirement: App bar menu dismissal

The panel SHALL close on Escape, on a press outside it and after a route
activation. Escape and a route activation SHALL return focus to the toggle when
the destination screen still shows it. Closing the panel SHALL NOT dispatch a
command or change the saved game.

**Source**: `SPEC.md` "CSS and accessibility"; issue #141
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Escape

- **WHEN** the panel is open and Escape is pressed
- **THEN** the panel closes, `aria-expanded` becomes `false` and focus returns to
  the toggle

#### Scenario: Outside press

- **WHEN** the panel is open and the host presses outside it
- **THEN** the panel closes and focus does not move

#### Scenario: Route activation

- **WHEN** a route link in the panel is activated
- **THEN** the destination screen renders with its panel closed

#### Scenario: No game change

- **WHEN** the panel is opened and closed without activating a route
- **THEN** no command is dispatched and the saved game is unchanged

### Requirement: One menu on every app bar

Every app bar that shows host navigation SHALL use the same menu behaviour,
including the React shell bar and the string-composed bar on `/help` and
`/demo`. The public screen SHALL keep no host navigation and SHALL render no
menu toggle.

**Source**: `SPEC.md` "CSS and accessibility"; issue #141
**Tests**: `scripts/browser-check.mjs`

#### Scenario: String-composed bar

- **WHEN** `/help` opens at 390 CSS pixels
- **THEN** its toggle opens the same panel content as the React bar

#### Scenario: Language from the panel

- **WHEN** the language changes from the open panel on `/help` or `/demo`
- **THEN** the screen re-renders in that language on the same route

#### Scenario: Public screen

- **WHEN** `/public` opens at 390 CSS pixels
- **THEN** no menu toggle and no route links render
