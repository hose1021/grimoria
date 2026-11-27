# Spec Delta

## MODIFIED Requirements

### Requirement: Material and palette roles

The interface SHALL use the dark stone surface scale, metal edges, brass and
amber for active and primary states, and crimson for danger and death. Role and
rules reading SHALL use parchment. `/table` and the `/seat` ring SHALL use the
table-scoped felt, rail, action and card tokens declared in `app/table-console`;
the `/table` player card MAY use parchment for the information it shows. A
single view SHALL show at most one magical glow, and no screen SHALL use a
multi-colour decorative gradient.

**Source**: owner-selected Arcane Instrument direction; `design/prototypes/03-arcane-instrument-full.html`; [Issue #164](https://github.com/hose1021/grimoria/issues/164); `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`

#### Scenario: Primary action uses amber

- **WHEN** a phase panel outside `/table` shows its primary action
- **THEN** that action uses the amber treatment and no other control on the
  panel uses the same treatment

#### Scenario: Table primary action

- **WHEN** `/table` shows its primary action
- **THEN** that action uses the table primary token and no other control on the
  dock uses that treatment

#### Scenario: Seat ring surface

- **WHEN** `/seat` shows the seat ring
- **THEN** the rail and felt use the table surface tokens and no amber hexagon
  or second surface appears

#### Scenario: Danger uses crimson

- **WHEN** the console offers an execution or another destructive action
- **THEN** only that action uses the danger treatment

#### Scenario: No decorative gradient

- **WHEN** any route renders
- **THEN** no full-page or card background uses a multi-colour gradient

#### Scenario: Player card parchment

- **WHEN** the player card is shown on `/table`
- **THEN** it uses the parchment card token for the information it shows

### Requirement: Typography and shape

Phase, role and section titles SHALL use the display serif. Interface data,
labels and controls SHALL use the sans face with tabular numerals where numbers
align. Page titles SHALL be 24 to 28 px, section titles 20 px, card titles 16 px,
body copy 13 to 14 px, captions at least 12 px, service labels 11-12 px and buttons
13-14 px. Corners SHALL be between 4 and 6 pixels, and controls SHALL NOT be
pill-shaped, except the `/table` dock controls, state badges, phase control and
player card, which use the table-scoped radii and shapes declared in
`app/table-console`.

**Source**: owner-selected Obsidian & Antique Gold direction; `SPEC.md` "CSS and accessibility"; [Issue #164](https://github.com/hose1021/grimoria/issues/164)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Phase title

- **WHEN** the console shows the current phase outside `/table`
- **THEN** the phase name renders in the display serif

#### Scenario: Sharp controls

- **WHEN** a button, input or panel outside `/table` renders
- **THEN** its computed corner radius is at most 6 pixels and it is not a pill

#### Scenario: Table controls

- **WHEN** a `/table` dock control, state badge, phase control or player card
  renders
- **THEN** it uses the table-scoped radius and shape token
