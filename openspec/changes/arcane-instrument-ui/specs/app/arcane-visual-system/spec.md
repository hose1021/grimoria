## Purpose

Defines the visual language and the presentational component contract of the
Grimoria interface, so every route reads as one dark fantasy tabletop client and
a Storyteller can read the game state at a glance.

## ADDED Requirements

### Requirement: Material and palette roles

The interface SHALL use the dark stone surface scale, metal edges, brass and
amber for active and primary states, crimson only for danger and death, and
parchment only for role and rules reading. A single view SHALL show at most one
magical glow, and no screen SHALL use a multi-colour decorative gradient.

**Source**: owner-selected Arcane Instrument direction; `design/prototypes/03-arcane-instrument-full.html`; `SPEC.md` "CSS and accessibility"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Primary action uses amber

- **WHEN** a phase panel shows its primary action
- **THEN** that action uses the amber treatment and no other control on the
  panel uses the same treatment

#### Scenario: Danger uses crimson

- **WHEN** the console offers an execution or another destructive action
- **THEN** only that action uses the crimson treatment

#### Scenario: No decorative gradient

- **WHEN** any route renders
- **THEN** no full-page or card background uses a multi-colour gradient

### Requirement: Typography and shape

Phase, role and section titles SHALL use the display serif. Interface data,
labels and controls SHALL use the sans face with tabular numerals where numbers
align. Corners SHALL be between 4 and 6 pixels, and controls SHALL NOT be
pill-shaped.

**Source**: owner-selected Arcane Instrument direction; `SPEC.md` "CSS and accessibility"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Phase title

- **WHEN** the console shows the current phase
- **THEN** the phase name renders in the display serif

#### Scenario: Sharp controls

- **WHEN** a button, input or panel renders
- **THEN** its computed corner radius is at most 6 pixels

### Requirement: Two-second state read

The console SHALL show the phase and day, the living and dead counts, each
seat's votes, poison and protection marks, the active actor and the single next
action without scrolling at 1440x900.

**Source**: `SPEC.md` "Screens" (`/table`); owner requirement "a Storyteller should understand the state within 2 seconds"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Day state

- **WHEN** an eight-player day opens at 1440x900
- **THEN** the phase, the nomination, the vote threshold, the dead seat and the
  execution control are visible in one viewport

#### Scenario: Night state

- **WHEN** a night step is active
- **THEN** the actor, the target choice, the step progress and the resolve
  control are visible in one viewport

### Requirement: Three-zone console

At desktop width the console SHALL place Storyteller controls on the left, the
seat table in the centre and the event log on the right, with the centre as the
largest zone.

**Source**: owner requirement "three main zones"; `design/prototypes/03-arcane-instrument-full.html`
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Desktop composition

- **WHEN** the console renders at 1440x900
- **THEN** the three zones are present and the centre zone is the widest

#### Scenario: Phone composition

- **WHEN** the console renders below 860 pixels
- **THEN** the table renders before the controls and the log, and the document
  does not scroll horizontally

### Requirement: Player token states

A player token SHALL render the seat number, player name, role artwork, alive or
dead state, vote count and active effects. A dead token SHALL carry a visible
mark and a strike, not colour alone. A token SHALL be at least 44x44 CSS pixels
and keyboard reachable.

**Source**: owner requirement "player cards"; `SPEC.md` "CSS and accessibility"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Dead seat

- **WHEN** a player dies
- **THEN** the token shows a mark and a struck name in addition to its muted
  artwork

#### Scenario: Effect marks

- **WHEN** a player is poisoned, protected or marked as the red herring
- **THEN** the token shows a labelled mark for that effect

#### Scenario: Vote count

- **WHEN** a nomination has votes
- **THEN** the token shows the count as discrete pips

### Requirement: Role card states

A role card SHALL support hidden, revealed and compact states. A revealed card
SHALL show the team, the role name, the ability and the active reminders. A
hidden card SHALL expose no real role in a public or player projection.

**Source**: `SPEC.md` "Screens"; `openspec/specs/app/ui-and-privacy/spec.md`
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Revealed card

- **WHEN** a player reveals their role
- **THEN** the card shows only that seat's shown role, its ability and reminder

#### Scenario: Hidden card

- **WHEN** the player screen is covered
- **THEN** the DOM carries no real role or secret effect

### Requirement: Action hierarchy

Each phase panel SHALL expose exactly one primary action, neutral actions and
any dangerous action with a distinct treatment. A disabled action SHALL state
why it is unavailable.

**Source**: owner requirement "buttons"; `SPEC.md` "Screens"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: One primary

- **WHEN** a phase panel renders
- **THEN** exactly one control carries the primary treatment

#### Scenario: Disabled reason

- **WHEN** an action is unavailable because targets are unresolved
- **THEN** the control is disabled and the reason is readable

### Requirement: Motion is state feedback only

Motion SHALL be limited to state feedback and transitions of 180 milliseconds or
less. Entrance choreography SHALL NOT be used, and
`prefers-reduced-motion: reduce` SHALL remove animation and smooth scrolling.

**Source**: `SPEC.md` "CSS and accessibility"; owner requirement "subtle magical glow"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Reduced motion

- **WHEN** the user requests reduced motion
- **THEN** no animation or transition runs

#### Scenario: Active actor

- **WHEN** the active actor changes
- **THEN** the change is conveyed by a static highlight and an optional short
  transition, not by a looping animation

### Requirement: Token-only styling

Every colour, radius, shadow and font used by the interface SHALL come from the
shared token layer. The `src/ui` tree SHALL NOT contain a literal colour value,
and the token check SHALL fail when a token has no source.

**Source**: `openspec/specs/app/design-tokens/spec.md`; `AGENTS.md` "Code Conventions"
**Tests**: `scripts/check-types-policy.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: Literal colour

- **WHEN** a component declares a hexadecimal or `rgb()` colour inline
- **THEN** the styling check fails

#### Scenario: Unmapped token

- **WHEN** the theme declares a token that has no source value
- **THEN** the styling check fails and names the token
