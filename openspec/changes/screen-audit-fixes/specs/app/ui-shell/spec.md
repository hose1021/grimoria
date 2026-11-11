# Spec Delta

## ADDED Requirements

### Requirement: Host navigation is the same on every host screen

The screens `/bag`, `/seat`, `/secrets` and `/table` SHALL render the same set
of route destinations in the same order. At 390 px the destination set SHALL
stay on one horizontal row, without a wrapped orphan row, and every destination
control SHALL be at least 44 by 44 CSS pixels. Actions that belong to one
screen, such as undo, export, import or hide, SHALL NOT be part of that
destination set.

**Source**: issue #135; `anti-slop/audit-001-2026-11-12.md` findings 4 and 8
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Same destinations

- **WHEN** `/bag`, `/seat`, `/secrets` and `/table` render at 1440 px
- **THEN** each host navigation exposes the same route destinations in the same
  order

#### Scenario: One bar on a phone

- **WHEN** the four host screens render at 390x844
- **THEN** the navigation bar occupies one row, and opening its menu lists every
  destination as a control of at least 44 by 44 CSS pixels inside the viewport,
  without a wrapped orphan row

#### Scenario: Local actions stay out

- **WHEN** the console renders its undo, export, import and hide controls
- **THEN** those controls sit outside the shared destination set

### Requirement: Status summaries separate their items

A support summary SHALL render its level and each count as separate items with
a visible separator or a wrapping gap, so no two labels or numbers touch at any
viewport width.

**Source**: issue #135; `anti-slop/audit-001-2026-11-12.md` finding 2
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Bag summary at both widths

- **WHEN** the bag screen renders at 1440x900 and at 390x844
- **THEN** the support summary items are separated by ` · ` and adjacent items
  either keep at least 6 px of horizontal space or sit on separate lines

#### Scenario: Secrets summary agrees

- **WHEN** the secrets screen renders its support summary
- **THEN** it uses the same separated form as the bag screen

### Requirement: A screen presents each action and sentence once

A screen SHALL show a given sentence at most once, and SHALL NOT render two
controls with the same label that invoke the same action.

**Source**: issue #135; `anti-slop/audit-001-2026-11-12.md` finding 7
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Balance sentence

- **WHEN** the bag screen renders a legal bag
- **THEN** the balance sentence appears once

#### Scenario: Demo reset

- **WHEN** the demo screen renders
- **THEN** one reset control is present

### Requirement: Role token labels stay legible

A role token label SHALL render at 11 CSS pixels or larger and SHALL NOT lose
text: the label either fits its token or wraps inside it, and the full role
name remains readable.

**Source**: issue #135; `anti-slop/audit-001-2026-11-12.md` finding 6
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Bag tokens on a phone

- **WHEN** the bag role tokens render at 390x844
- **THEN** every label computes to at least 11 px and no label is clipped by its
  token

#### Scenario: Longest name

- **WHEN** a token carries a long role name such as "Девственница" or
  "Смотритель Воронов"
- **THEN** the full name is visible, either on one line or on two

### Requirement: Tall screens use the vertical space

On `/seat` and `/player` at 390x844, the primary content SHALL sit in the
vertical middle of the available height, and the space above and below it SHALL
differ by no more than 40 CSS pixels.

**Source**: issue #135; `anti-slop/audit-001-2026-11-12.md` finding 9
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Seat ring

- **WHEN** the seat order renders at 390x844
- **THEN** the space above and below the seat ring differ by no more than 40 px

#### Scenario: Player handoff

- **WHEN** the player handoff renders at 390x844
- **THEN** the space above and below the handoff content differ by no more than
  40 px
