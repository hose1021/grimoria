# Spec Delta

## ADDED Requirements

### Requirement: Built artifact styles load offline

The built artifact SHALL ship the application styles itself, with no CDN and no
external request at run time. The one global stylesheet SHALL be present in the
cached artifact, so every route renders its styles with the network disabled.

**Source**: `AGENTS.md` "Runtime/Tooling Preferences"; issue #69, issue #137
**Tests**: `scripts/browser-check.mjs`, `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Offline load

- **WHEN** the app loads from the service worker with the network disabled
- **THEN** the styles are available and no request leaves the origin

#### Scenario: Every route after load

- **WHEN** the app runs from the cached artifact without the network
- **THEN** every route renders with its styles and no console error

### Requirement: Setup screens style with utilities

`/bag`, `/seat` and `/secrets` SHALL be styled by Tailwind utilities and theme
tokens only, with no `bag-*`, `seat-*`, `setup-*`, `secrets-*` or `script-*`
rule left in the repository. Their computed typography, spacing, borders,
colours and responsive layout SHALL match the recorded pre-migration baseline.

**Source**: `AGENTS.md` "Code Conventions"; `docs/architecture.md` "UI shell"; issue #82, issue #137
**Tests**: `scripts/style-parity.mjs`, `scripts/browser-check.mjs`

#### Scenario: Narrow layout

- **WHEN** `/bag`, `/seat` or `/secrets` renders at 360 px
- **THEN** neither the page nor the seat ring overflows horizontally

#### Scenario: No screen rule remains

- **WHEN** the tracked stylesheets and markup are scanned
- **THEN** no selector carries a setup screen prefix

#### Scenario: Interactive states

- **WHEN** a control on a setup screen is hovered, disabled or focused with the
  keyboard
- **THEN** its recorded state styles match the baseline

### Requirement: Computed-style parity

A committed baseline SHALL record the computed styles of named elements on
`/bag`, `/seat`, `/secrets`, `/table`, `/player`, `/sheet`, `/help` and `/demo`
from the pre-migration build. A check SHALL compare the current build against
that baseline at 1280 px and 390 px, and SHALL fail naming the route, element
and property that changed.

**Source**: `AGENTS.md` "Code Conventions"; issue #137
**Tests**: `scripts/style-parity.mjs`, `scripts/browser-check.mjs`

#### Scenario: Unchanged route

- **WHEN** a migrated route renders at either recorded width
- **THEN** every recorded element matches the baseline

#### Scenario: Changed style

- **WHEN** a utility edit changes a recorded property
- **THEN** the check exits non-zero and names the route, the element and the
  property

#### Scenario: State coverage

- **WHEN** the baseline records hover, disabled, keyboard focus or reduced
  motion for a control
- **THEN** the same states are compared for the current build

## MODIFIED Requirements

### Requirement: Console styles without legacy stylesheets

The console, `/help` and `/demo` SHALL be styled by Tailwind utilities and
theme tokens only, with no `host-*`, `tbl-*`, `help-*` or `demo-*` rule left
anywhere in the repository. Their grids, card and seat sizes, alert and log
blocks, shared primitives and responsive layout SHALL keep the pre-migration
computed styles.

**Source**: `AGENTS.md` "Runtime/Tooling Preferences"; `docs/architecture.md` "UI shell"; issue #137
**Tests**: `scripts/browser-check.mjs`, `scripts/style-parity.mjs`

#### Scenario: Phone width

- **WHEN** the console renders at 390 pixels
- **THEN** the document does not scroll horizontally

#### Scenario: Demo and help

- **WHEN** `/demo` and `/help` render after the migration
- **THEN** their grids, card and seat sizes, alert and log blocks and their
  responsive layout match the recorded computed-style baseline

## REMOVED Requirements

### Requirement: Shell styles without a global reset

**Reason**: The shell no longer coexists with unlayered legacy stylesheets.
Every route is a native screen or a utility-styled DOM screen, so one global
Tailwind stylesheet with Preflight applies to all of them.

**Migration**: The offline half of this requirement is preserved by "Built
artifact styles load offline". The "Legacy screen unchanged" scenario is
replaced by "Computed-style parity", which compares every route against the
pre-migration baseline.

### Requirement: Setup screens keep their stylesheets

**Reason**: The deferred conversion is this change. `css/bag.css`,
`css/seat.css` and `css/setup.css` are deleted, and the screens use utilities.

**Migration**: "Setup screens style with utilities" keeps the narrow-layout
scenario and adds the baseline comparison, so the computed styles still have a
test.
