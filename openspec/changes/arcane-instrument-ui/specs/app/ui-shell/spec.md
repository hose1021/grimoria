## MODIFIED Requirements

### Requirement: Role sheet parity

`/sheet` SHALL render the 72 standard roles across the three scripts and the 5
Travellers in their separate section, filter by scenario, switch language
between Russian, English and Azerbaijani, and show each role's artwork. Roles
SHALL be grouped by team in the script's order, each group naming the team and
its count. The screen SHALL be read-only: it SHALL NOT dispatch commands or
persist anything.

**Source**: `SPEC.md` "Screens"; issue #69
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Role counts

- **WHEN** `/sheet/en` opens with no filter
- **THEN** 72 standard roles and 5 Travellers are present

#### Scenario: Scenario filter

- **WHEN** the Trouble Brewing filter is active
- **THEN** only that script's roles remain and the Travellers stay in their own
  section

#### Scenario: Language switch

- **WHEN** the language changes to Azerbaijani
- **THEN** the names and abilities come from that catalog and the URL reflects it

#### Scenario: Read-only

- **WHEN** the sheet is used
- **THEN** no command is dispatched and the saved game is unchanged

#### Scenario: Team groups

- **WHEN** a scenario is shown
- **THEN** its roles appear under Townsfolk, Outsider, Minion and Demon groups
  with a count for each group

### Requirement: One next step per phase

The console SHALL show exactly one phase panel for the current phase: the setup
prompt, the deal panel, the night panel, the day panel or the over panel. The
night panel SHALL name the current step and the actor, SHALL show step progress,
and SHALL keep the complete control unavailable while the targets, the
information choice or the Mayor redirection are unresolved. For a night step
that accepts targets, the table SHALL be the target control: activating a seat
token SHALL select or deselect it, and the panel SHALL show the prompt and the
chosen names rather than a duplicate target list. Skipping a step SHALL record a
reason.

**Source**: `SPEC.md` "Screens" (`/table`); issue #45
**Tests**: `scripts/browser-check.mjs`, `src/core/engine/engine.test.ts`

#### Scenario: Unresolved targets

- **WHEN** the step needs a target and none is selected
- **THEN** the complete control is unavailable and the reason is shown

#### Scenario: Targets on the table

- **WHEN** a night step accepts one or two targets
- **THEN** activating a seat token selects or deselects that player, the panel
  lists the chosen names, and the complete control enables only when the choice
  is valid

#### Scenario: Skip needs a reason

- **WHEN** the host skips the step without a reason
- **THEN** the step stays current and nothing is recorded

#### Scenario: Phase card

- **WHEN** the phase changes from night to day
- **THEN** only the day panel renders and the night queue stays in the controls
  zone

### Requirement: Correction, role card and review

A seat token on the table SHALL select or deselect the target for the current
night step when that step accepts targets; otherwise it SHALL open the
correction dialog with the alive toggle, the role change, the reminder, the
winner rollback and the claim recovery. Applying a correction SHALL require a
reason. The role card control
SHALL open the role card. The over panel SHALL hide the review table until the
review control is used and SHALL require a second confirmation before starting a
new game.

**Source**: `SPEC.md` "Screens" (`/table`); issue #42
**Tests**: `scripts/browser-check.mjs`, `src/core/engine/commands.test.ts`

#### Scenario: Target or correction

- **WHEN** the host activates a seat during a target step and again outside a
  target step
- **THEN** the first activation selects the target and the second opens the
  correction dialog

#### Scenario: Correction reason

- **WHEN** a correction is applied without a reason
- **THEN** the dialog stays open and the reason field is reported

#### Scenario: Review gate

- **WHEN** the game is over
- **THEN** the review table stays hidden until the review control is used

#### Scenario: New game

- **WHEN** the new game control is used once
- **THEN** the game is unchanged and the confirmation is shown

### Requirement: Side panel, notes and backups

The console SHALL expose the night queue with progress, the last eight log
entries, the notes field, the day timer and the backup controls. The side panels
SHALL be informational: step hints, progress, the log, notes and backups; they
SHALL NOT duplicate the seat target choice. Notes SHALL be saved through the
store. Export SHALL offer the game JSON through text, download
and copy, and the download name SHALL start with `grimoria-`. Import SHALL ask
for confirmation and SHALL show the error reason when the text is rejected. A
failed save SHALL be visible in the console.

**Source**: `SPEC.md` "Screens" (`/table`); issue #54
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Hints, not controls

- **WHEN** a target step renders
- **THEN** the side panels show the prompt, the chosen names and the hints, and
  no duplicate target buttons

#### Scenario: Notes persist

- **WHEN** the host types a note and returns to the console
- **THEN** the note is still there and the saved game contains it

#### Scenario: Export download

- **WHEN** the host downloads the export
- **THEN** the file name starts with `grimoria-` and the JSON keeps its format
  identifier

#### Scenario: Import rejected

- **WHEN** the import text is not a valid game
- **THEN** the dialog reports the reason and the saved game is unchanged

### Requirement: Console styles without legacy stylesheets

Every route SHALL be styled by Tailwind utilities and shared tokens only. No
`host-*`, `tbl-*`, `bag-*`, `seat-*`, `setup-*`, `help-*` or `demo-*` rule SHALL
remain after the migration. `css/bag.css`, `css/seat.css` and `css/setup.css`
SHALL be deleted and not loaded. Retained legacy class names SHALL be inert
hooks for the browser checks.

**Source**: `AGENTS.md` "Runtime/Tooling Preferences"; `docs/architecture.md` "UI shell"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Phone width

- **WHEN** the console renders at 390 pixels
- **THEN** the document does not scroll horizontally

#### Scenario: Demo and help

- **WHEN** `/demo` and `/help` render after the migration
- **THEN** their grids, alerts, logs and responsive layout render from utilities
  and tokens

#### Scenario: No legacy rule

- **WHEN** the built stylesheets are scanned
- **THEN** no rule for the listed legacy prefixes exists

### Requirement: Bag editor

The bag screen SHALL edit the script pool, the player count, the roles, the
bluffs and the special setup choices through one bag command, SHALL offer the
recommended presets, the random picker, the manual picker, the named library and
the import/export paths, and SHALL deal the bag only when it is legal. The
manual picker SHALL list every role of the selected script grouped by team and
SHALL NOT offer a search field or edition and team filters.

**Source**: `SPEC.md` `/bag`; issue #82; owner requirement "manual assembly groups roles"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Preset

- **WHEN** a recommended preset is applied
- **THEN** the count, the roles and the bluffs match that preset

#### Scenario: Illegal bag

- **WHEN** the composition is incomplete
- **THEN** the status lists the errors and the deal control is unavailable

#### Scenario: Undo

- **WHEN** a role is picked and undo is used
- **THEN** the previous bag returns

#### Scenario: Manual grouping

- **WHEN** the manual picker is active
- **THEN** every role of the selected script appears under its team heading with
  a count, and no search or edition filter is present

## ADDED Requirements

### Requirement: Shell base and global reset

The built artifact SHALL ship the shell's styles itself, with no CDN and no
external request at run time. Once every route uses utilities and shared tokens,
the shell SHALL apply one global reset so components render consistently, and no
route SHALL depend on an unlayered legacy rule for its layout.

**Source**: `AGENTS.md` "Runtime/Tooling Preferences"; issue #69; Arcane Instrument change
**Tests**: `scripts/browser-check.mjs`, `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Offline load

- **WHEN** the app loads from the service worker with the network disabled
- **THEN** the shell's styles are available and no request leaves the origin

#### Scenario: Reset after the cutover

- **WHEN** the global reset is enabled and every route renders
- **THEN** no route loses spacing, focus, list or form styling compared with
  its migrated state

### Requirement: Mobile console composition

At a phone viewport the console SHALL render the seat table before the controls
and the event log. The top navigation SHALL keep the setup, seat, player,
public, role sheet and help routes reachable, and the fixed footer dock SHALL
not render. The document SHALL not scroll horizontally at 360 or 390 pixels.

**Source**: `SPEC.md` "CSS and accessibility"; issue #45
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Table first

- **WHEN** the console opens at 390 pixels
- **THEN** the table renders above the controls and the log

#### Scenario: Routes reachable

- **WHEN** the host uses the phone navigation
- **THEN** setup, seats, player, public, role sheet and help can each be opened

#### Scenario: No fixed dock

- **WHEN** the console renders at 390 pixels
- **THEN** no fixed footer navigation is present

## REMOVED Requirements

### Requirement: Setup screens keep their stylesheets

**Reason**: This change converts the three setup screens to utilities and tokens,
so keeping `css/bag.css`, `css/seat.css` and `css/setup.css` as their only style
source directly contradicts the design.

**Migration**: Every setup control is restyled with the Arcane components and
utilities. The browser checks keep their behavioural assertions and update any
selector that read a deleted rule, while retained class names remain inert
hooks. Parity is proven at 360, 390 and 1440 pixels.

### Requirement: Shell styles without a global reset

**Reason**: The shell now ships a deliberate global reset, and no legacy route
depends on unlayered rules after the cutover, so the old prohibition no longer
describes the product.

**Migration**: The reset lands only after `/help` and `/demo` move to utilities.
Each route is checked at 1440, 390 and 360 pixels before the old stylesheets are
deleted. The new requirement "Shell base and global reset" carries the current
behaviour.

### Requirement: Mobile panels and dock

**Reason**: The play, roster and tools panels are replaced by a single stacked
phone console with the table first, so the panel switch no longer exists.

**Migration**: The dock links stay. The new requirement "Mobile console
composition" defines the order and reachability. Browser checks that pressed a
panel control are updated to assert the stacked order instead.
