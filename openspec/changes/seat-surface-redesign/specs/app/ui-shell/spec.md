# Spec Delta

## ADDED Requirements

### Requirement: Seat screen table composition

`/seat` SHALL render one table surface with the shared app bar, one vertical
stage and one fixed action dock. The stage SHALL show a measured stadium rail
and felt with the seats on that contour and a numeric centre. The screen SHALL
NOT render side columns or a second panel layout.

**Source**: `SPEC.md` "Screens" (`/seat`); `app/table-console` "Table theme tokens and visual scope"; issue #164; `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`

#### Scenario: One surface

- **WHEN** `/seat` renders a dealt game
- **THEN** the stage contains one table rail, one felt and no side column

#### Scenario: Fifteen names at 390

- **WHEN** a fifteen-player seat order renders at 390 px
- **THEN** all fifteen player names are visible on the contour and the document
  does not scroll horizontally

#### Scenario: Fixed dock

- **WHEN** the stage is scrolled
- **THEN** the dock stays at the bottom of the viewport with its status line and
  actions usable

### Requirement: Seat medallions and centre readout

Each seat SHALL render as a round medallion carrying the player initial, with
the player name on the contour side the table uses and the seat number from
620 px. Seat 1 SHALL carry a start mark. The centre SHALL show the player count
as the largest numeral with the small-caps players label and the dead count.

**Source**: `SPEC.md` "Screens" (`/seat`); `app/table-console` "Visible seats and role identity"; `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`

#### Scenario: Round medallion

- **WHEN** a seat renders
- **THEN** its medallion has a round shape, shows the player initial and shows
  no role artwork

#### Scenario: Seat number

- **WHEN** `/seat` renders at 620 px or wider
- **THEN** every medallion shows its seat number

#### Scenario: Selection

- **WHEN** a seat is picked or hovered as a drag target
- **THEN** it carries the table primary outline instead of the amber hexagon

#### Scenario: Centre count

- **WHEN** the ring renders seven players of which two are dead
- **THEN** the centre shows `7` as the largest numeral, the players label and
  the dead count

## MODIFIED Requirements

### Requirement: Seat order draft

The seat screen SHALL keep the seat order as a local draft: selecting or dragging
one seat onto another SHALL swap them, shuffle and undo SHALL change only the
draft, and the use action SHALL commit it. A published state SHALL update the
names on the ring without replacing a non-empty draft. The ring and the drag
ghost SHALL show player names and seat numbers only.

**Source**: `SPEC.md` "Screens" and `/seat` "names only"; issue #82; issue #171
SET8
**Tests**: `scripts/browser-check.ts`, `src/ui/screens/seat-projection.test.ts`

#### Scenario: Publish while editing

- **WHEN** the store publishes a renamed player while a draft is open
- **THEN** the ring shows the new name and keeps the draft order

#### Scenario: Empty draft

- **WHEN** the store publishes an order while the screen shows the empty state
- **THEN** the ring renders that order

#### Scenario: Swap

- **WHEN** two seats are activated in turn
- **THEN** their occupants swap, the status line names the result and undo
  restores the previous order

#### Scenario: Names only

- **WHEN** the seat route renders a dealt game
- **THEN** every seat shows a player name and, from 620 px, its seat number, and
  no role name, role artwork, team or alive state

### Requirement: Setup screens style with utilities

`/bag`, `/seat` and `/secrets` SHALL be styled by Tailwind utilities and theme
tokens only, with no `bag-*`, `seat-*`, `setup-*`, `secrets-*` or `script-*`
rule left in the repository. `/bag` and `/secrets` SHALL keep their recorded
pre-migration computed styles. `/seat` SHALL follow the table surface standard
declared in `app/table-console` instead of the pre-migration baseline.

**Source**: `AGENTS.md` "Code Conventions"; `docs/architecture.md` "UI shell"; issue #82, issue #137
**Tests**: `scripts/browser-check.ts`

#### Scenario: Narrow layout

- **WHEN** `/bag`, `/seat` or `/secrets` renders at 360 px
- **THEN** neither the page nor the seat ring overflows horizontally

#### Scenario: No screen rule remains

- **WHEN** the tracked stylesheets and markup are scanned
- **THEN** no selector carries a setup screen prefix

#### Scenario: Interactive states

- **WHEN** a control on the bag or secrets screen is hovered, disabled or
  focused with the keyboard
- **THEN** its recorded state styles match the baseline
