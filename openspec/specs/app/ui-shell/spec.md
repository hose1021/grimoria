# app/ui-shell Specification

## Purpose
Defines the application shell that hosts every route: how the shell keeps
unmigrated routes alive, how a screen reads the game through one subscription,
the shared component behaviour, and the parity of the first migrated screen, the
role sheet.

## Requirements

### Requirement: Shell owns every route

Every existing path SHALL render the same screen after the shell is adopted.
Routes that are not migrated yet SHALL render through a bridge that calls the
legacy screen's mount and cleanup; navigating away SHALL dispose the previous
route's listeners, timers and subscriptions before the next route mounts.
Unknown paths SHALL keep falling back to the table screen.

**Source**: `docs/architecture.md` "Migration map"; issue #69
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Direct link

- **WHEN** a route such as `/table` or `/sheet/ru` is opened directly
- **THEN** the matching screen renders, including its language, with no console
  error

#### Scenario: Route switch disposes

- **WHEN** the user navigates from one route to another
- **THEN** the previous screen's cleanup runs before the next screen mounts

#### Scenario: Partial mount failure

- **WHEN** the requested locale catalog fails to load
- **THEN** the shell shows a recoverable error and the cleanup path still runs

### Requirement: One subscription over the game state

A screen SHALL read the game state through the store's subscription with an
immutable snapshot that is stable between changes. A re-render SHALL happen only
when the snapshot changes. A screen SHALL NOT mutate the state directly, keep a
second store, or persist transient UI drafts.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #69
**Tests**: `src/entry/store.test.ts`, `scripts/browser-check.mjs`

#### Scenario: Stable snapshot

- **WHEN** no command has been applied
- **THEN** two consecutive reads return the same snapshot reference

#### Scenario: Failed save is visible

- **WHEN** a command applies but the save fails
- **THEN** subscribers receive a snapshot whose save status reports the failure
  and the game state is not rolled back silently

#### Scenario: No second store

- **WHEN** the shell and a screen read the game
- **THEN** both see the same store instance, and no module creates another

### Requirement: Shared dialog behaviour

The dialog component SHALL move focus inside on open, close on Escape, restore
focus to the trigger on close, expose an accessible name and `aria-modal`, and
keep its controls usable at a 390 px viewport. Closing by overlay activation or
the explicit close control SHALL behave like Escape.

**Source**: `SPEC.md` "Screens"; issue #69
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Keyboard close

- **WHEN** the dialog is open and the user presses Escape
- **THEN** it closes and focus returns to the element that opened it

#### Scenario: Accessible name

- **WHEN** the dialog is open
- **THEN** assistive technology can read its title and the content behind it is
  marked inactive

### Requirement: Role sheet parity

`/sheet` SHALL render the 72 standard roles across the three scripts and the 5
Travellers in their separate section, filter by scenario, switch language
between Russian, English and Azerbaijani, and show each role's artwork. The
header SHALL carry no route link and no language control: the app bar menu is
the only navigation surface. The screen SHALL be read-only: it SHALL NOT
dispatch commands or persist anything.

**Source**: `SPEC.md` "Screens"; issue #69; owner screenshot review of
`/sheet/ru`
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Role counts

- **WHEN** `/sheet/en` opens with no filter
- **THEN** 72 standard roles and 5 Travellers are present

#### Scenario: Scenario filter

- **WHEN** the Trouble Brewing filter is active
- **THEN** only that script's roles remain and the Travellers stay in their own
  section

#### Scenario: Language switch

- **WHEN** the host opens the app bar menu and chooses Azerbaijani while the
  sheet is open
- **THEN** the names and abilities come from that catalog, the URL ends in
  `/sheet/az`, and the scenario and Travellers preferences are unchanged

#### Scenario: One navigation surface

- **WHEN** `/sheet/ru` renders at 390 or 1440 CSS pixels
- **THEN** the header shows the title, intro, summary and filters, with no route
  link and no language control, and the app bar menu carries the table, Help
  and language controls

#### Scenario: Read-only

- **WHEN** the sheet is used
- **THEN** no command is dispatched and the saved game is unchanged

### Requirement: Player handoff renders in the shell

`/player` SHALL render as a native shell screen, not through the legacy bridge.
The picker SHALL show one number per seat, SHALL label a claimed seat with its
saved name, SHALL label a seat without a shown role as unavailable, and SHALL
open only a free seat that has a shown role. The picker projection SHALL carry
the shown role id only: no real role, reminder, effect, bluff or note.

**Source**: `SPEC.md` `/player`; issue #77
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Claimed seat

- **WHEN** a seat is claimed
- **THEN** its number is disabled and labelled with the stored name

#### Scenario: No role yet

- **WHEN** the bag has not been dealt
- **THEN** no number is selectable, the setup link is shown, and the DOM carries
  no role, reminder, effect or bluff

#### Scenario: Free number

- **WHEN** a free seat with a shown role is tapped
- **THEN** the card renders that seat's shown role only

### Requirement: Picker follows the store

The screen SHALL read the game through the shell subscription and SHALL update
when the store publishes a change, without a route change or a manual re-render.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #77
**Tests**: `scripts/browser-check.mjs`

#### Scenario: External publish

- **WHEN** the store publishes a state with a newly claimed seat
- **THEN** that number becomes disabled without navigation

### Requirement: Role card deadline

The role card SHALL hide 45 seconds after the number tap. A re-render SHALL NOT
extend the deadline. The card SHALL also close on Escape, when the document
becomes hidden and when the page is hidden.

**Source**: `SPEC.md` `/player`; `SPEC.md` "Reliability and live-play additions"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Deadline not extended

- **WHEN** the game state publishes while the card is open
- **THEN** the remaining time counts from the original deadline

#### Scenario: Auto hide

- **WHEN** 45 seconds pass with the card open
- **THEN** the card closes and the picker returns

#### Scenario: Escape

- **WHEN** the card is open and the user presses Escape
- **THEN** the card closes without a claim

### Requirement: Claim through the shell

The screen SHALL claim a seat by dispatching `claimSeat` through a shell port,
SHALL require a non-empty name, SHALL show the rejection reason and keep the card
open when the command is rejected, and SHALL return to the picker after a
successful claim.

**Source**: `SPEC.md` `/player`; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `scripts/browser-check.mjs`, `src/core/engine/commands.test.ts`

#### Scenario: Empty name

- **WHEN** the name is empty or whitespace
- **THEN** the card stays open and the name field takes focus

#### Scenario: Rejected claim

- **WHEN** the command is rejected, for example for an already claimed seat
- **THEN** the reason is shown and the card stays open

### Requirement: Hand-back warning

The back control SHALL open a modal warning that moves focus inside, closes on
Escape and on the cancel control, and leaves the handoff only from the confirm
control. The modal SHALL expose an accessible name and `aria-modal`.

**Source**: `SPEC.md` `/player`; issue #77
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Focus inside

- **WHEN** the warning is open
- **THEN** the active element is inside the modal

#### Scenario: Cancel

- **WHEN** the cancel control or Escape is used
- **THEN** the warning closes and the handoff stays open

#### Scenario: Confirm

- **WHEN** the confirm control is used
- **THEN** the route changes to `/table`

### Requirement: Setup screens render in the shell

`/bag`, `/seat` and `/secrets` SHALL render as native shell screens.
Navigating away SHALL dispose their listeners, timers and pointer handlers.

**Source**: `SPEC.md` "Screens"; issue #82
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Direct link

- **WHEN** `/bag`, `/seat` or `/secrets` is opened directly
- **THEN** the matching screen renders without the legacy bridge

### Requirement: Seat order draft

The seat screen SHALL keep the seat order as a local draft: selecting two seats
SHALL swap them, dragging a seat onto another SHALL swap them, and shuffle and
undo SHALL change only the draft. The draft SHALL be committed only by the use
action. A published state SHALL update the names and role art on the ring, SHALL
NOT replace a non-empty draft, and SHALL fill an empty draft.

**Source**: `SPEC.md` "Screens"; issue #82
**Tests**: `scripts/browser-check.mjs`

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

### Requirement: Setup secrets

The secrets screen SHALL edit the one-of-two pairs, the Drunk mask pair and the
red herring through commands, SHALL list the reminders and the host-only roster,
and SHALL start the first night only when the secrets are complete. Bad Moon
Rising and Sects & Violets SHALL render their own setup summaries instead.

**Source**: `SPEC.md` `/secrets`; issue #82
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Red herring

- **WHEN** the Fortune Teller is in play
- **THEN** the herring picker offers every good player, including the Fortune
  Teller, and records the choice

#### Scenario: Incomplete secrets

- **WHEN** a required pair or the herring is missing
- **THEN** the start control is disabled and the errors are listed

#### Scenario: Librarian zero

- **WHEN** the Librarian is in play and no Outsider is
- **THEN** the screen normalizes the zero information once

### Requirement: Bag editor

The bag screen SHALL edit the script pool, the player count, the roles, the
bluffs and the special setup choices through one bag command, SHALL offer the
recommended presets, the manual picker with its search and filters, the named
library and the import/export paths, and SHALL deal the bag only when it is
legal.

**Source**: `SPEC.md` `/bag`; issue #82
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

### Requirement: Storyteller console renders in the shell

`/table` SHALL render as a native shell screen and SHALL NOT mount through the
legacy bridge. It SHALL dispose its listeners and timer when the route changes.

**Source**: `SPEC.md` "Screens"; `docs/architecture.md` "Migration map"; issue #85
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Direct link

- **WHEN** `/table` is opened directly
- **THEN** the console renders without the legacy bridge and owns the saved game

#### Scenario: Route switch

- **WHEN** the host navigates from `/table` to `/seat`
- **THEN** the console cleanup runs and its timer and listeners are gone

### Requirement: One next step per phase

The console SHALL show exactly one card for the current phase: the setup prompt,
the deal card, the night card, the day card or the over card. The night card
SHALL name the current step and the actor, SHALL show step progress, and SHALL
keep the complete control unavailable while the targets, the information choice
or the Mayor redirection are unresolved. Skipping a step SHALL record a reason.

**Source**: `SPEC.md` "Screens" (`/table`); issue #45
**Tests**: `scripts/browser-check.mjs`, `src/core/engine/engine.test.ts`

#### Scenario: Unresolved targets

- **WHEN** the step needs a target and none is selected
- **THEN** the complete control is unavailable and the reason is shown

#### Scenario: Skip needs a reason

- **WHEN** the host skips the step without a reason
- **THEN** the step stays current and nothing is recorded

#### Scenario: Phase card

- **WHEN** the phase changes from night to day
- **THEN** only the day card renders and the night queue stays in the side panel

### Requirement: Five-part step guidance

The night card SHALL show the host action, the player action, the grimoire note,
the public line and the check for the current step, and SHALL persist the
expanded state of that guidance across routes and reloads.

**Source**: `SPEC.md` "Screens" (`/table`); issue #45
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Expanded state

- **WHEN** the host expands the guidance and returns later
- **THEN** the guidance is still expanded

#### Scenario: A role without a dedicated guide

- **WHEN** the current step has no dedicated guide
- **THEN** the generic instruction text is shown, never a raw key

### Requirement: Night information and registrations

The night card SHALL preview the computed information for the current targets,
SHALL let the host replace it with a given answer for that step, SHALL offer the
Spy and Recluse registration choices, SHALL open the information card, and
SHALL show the Spy the grimoire overlay instead.

**Source**: `SPEC.md` "Screens" (`/table`); `SPEC.md` "Domain rules"
**Tests**: `scripts/browser-check.mjs`, `src/core/engine/engine.test.ts`

#### Scenario: Information card

- **WHEN** the targets are complete and the host shows the card
- **THEN** the card repeats the computed information for that step

#### Scenario: Given answer

- **WHEN** the host picks another answer for the step
- **THEN** the completed step carries that answer and the preview matches it

#### Scenario: Grimoire

- **WHEN** the current step belongs to the Spy
- **THEN** the host opens a grimoire overlay listing every seat with its role

### Requirement: Day execution and role panels

The day card SHALL announce the morning deaths, SHALL show the vote threshold as
`ceil(living / 2)`, SHALL record the host's execution with the optional
survival choice, and SHALL offer the Virgin nomination, Slayer, Gossip,
Moonchild and Mastermind panels only when they apply. A custom script SHALL
offer the manual winner instead.

**Source**: `SPEC.md` "Screens" (`/table`); `SPEC.md` "Domain rules"
**Tests**: `scripts/browser-check.mjs`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Vote threshold

- **WHEN** six players are alive
- **THEN** the day card shows three votes as the threshold

#### Scenario: Execution result

- **WHEN** the host records an execution
- **THEN** the day card names the executed player and whether the death happened

#### Scenario: Manual winner

- **WHEN** the script is custom
- **THEN** the day card offers a winner team and records it

### Requirement: Correction, role card and review

A seat in the rail SHALL open the correction dialog with the alive toggle, the
role change, the reminder, the winner rollback and the claim recovery; applying
a correction SHALL require a reason. A role token SHALL open the role card. The
over card SHALL hide the review table until the review control is used and
SHALL require a second confirmation before starting a new game.

**Source**: `SPEC.md` "Screens" (`/table`); issue #42
**Tests**: `scripts/browser-check.mjs`, `src/core/engine/commands.test.ts`

#### Scenario: Correction reason

- **WHEN** a correction is applied without a reason
- **THEN** the dialog stays open and the reason field is reported

#### Scenario: Review gate

- **WHEN** the game is over
- **THEN** the review table stays hidden until the review control is used

#### Scenario: New game

- **WHEN** the new game control is used once
- **THEN** the game is unchanged and the confirmation is shown

### Requirement: Undo through the shell

The console SHALL expose an undo control that is unavailable when no earlier
state can be restored, SHALL restore the previous game state through the shell
without leaving the route, and SHALL close any open overlay after a successful
undo.

**Source**: `SPEC.md` "Screens" (`/table`); `AGENTS.md` "Architecture & Data Flow"
**Tests**: `src/entry/store.test.ts`, `scripts/browser-check.mjs`

#### Scenario: Nothing to undo

- **WHEN** no command has been applied yet
- **THEN** the undo control is unavailable

#### Scenario: Undo restores the previous state

- **WHEN** the host activates undo after a command
- **THEN** the previous state returns, the console re-renders and any open
  overlay is closed

### Requirement: Side panel, notes and backups

The side panel SHALL show the night queue with progress, the last eight log
entries, the notes field, the day timer and the backup controls. Notes SHALL be
saved through the store. Export SHALL offer the game JSON through text, download
and copy, and the download name SHALL start with `grimoria-`. Import SHALL ask
for confirmation and SHALL show the error reason when the text is rejected. A
failed save SHALL be visible in the console.

**Source**: `SPEC.md` "Screens" (`/table`); issue #54
**Tests**: `scripts/browser-check.mjs`

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

### Requirement: Mobile panels and dock

At a phone viewport the console SHALL show the play, roster and tools panels
with the current panel marked pressed, defaulting to play. The dock SHALL link
to the setup, seat, player, public, role sheet and help routes.

**Source**: `SPEC.md` "CSS and accessibility"; issue #45
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Default panel

- **WHEN** the console opens at 390 pixels
- **THEN** the play panel is active and no route overflows horizontally

#### Scenario: Panel switch

- **WHEN** the host activates the roster panel
- **THEN** the roster shows and the play panel is marked unpressed

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

### Requirement: Screens render one projection

The derived console facts — the current step, its progress, the pending demon
change, the living count and threshold, the target bounds, information, effects
and Mayor redirect, the seat facts, and the setup and secrets errors — SHALL be
computed once by the engine and the read models in
`src/application/read-models/`. A screen SHALL render them and SHALL NOT call an
engine function or import the engine or `js/`.

**Source**: issue #33, parent #19 Stage 1; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `src/application/read-models/table.test.ts`, `src/ui/screens/structure.test.ts`

#### Scenario: Projection after every command

- **WHEN** the scenario applies the setup, first night, day and second-night
  commands, including an Imp attack on the Mayor
- **THEN** after every command the table, step and seat projections equal the
  engine's current step, progress, pending demon change, execution threshold,
  information, effects and seat facts

#### Scenario: Registrations reach the answer

- **WHEN** the host registers the Recluse as evil for the Chef
- **THEN** the step projection hands the same Chef count as the engine and the
  count differs from the unregistered answer

#### Scenario: Screen import boundary

- **WHEN** a module under `src/ui/screens` imports `src/core/engine` or `js/`
- **THEN** the structure test fails and names the file and the specifier

#### Scenario: No behavior change

- **WHEN** the screens render from the projection
- **THEN** the values, the dispatch commands and the persisted state are
  unchanged from the direct engine calls

### Requirement: Preview at the dispatch boundary

The command preview SHALL be built by `src/application/dispatch/preview.ts`,
which adds the fresh command id and the ruleset version. The composition root
SHALL NOT import the engine to build it.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #33
**Tests**: `src/application/read-models/table.test.ts`, `src/ui/screens/structure.test.ts`

#### Scenario: Composition root stays rule-free

- **WHEN** `src/entry` imports the engine to build a preview command
- **THEN** the structure test fails; the preview is built at the dispatch
  boundary instead

#### Scenario: Preview keeps apply's timestamp

- **WHEN** the screen previews a command
- **THEN** the fresh id pins the timestamp that apply reuses for the same
  initial state

### Requirement: Phone finale path is reachable by touch

From a clean browser profile at 360x640 portrait and 640x360 landscape, the
shell SHALL reach the setup prompt, the bag, the player handoff, the seat
order, the setup secrets, the first night, the first day, the over card and the
role review using only visible controls, without a config file and without a
saved bag registry.

**Source**: issue #46; `SPEC.md` "Screens"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Clean profile

- **WHEN** the app loads in a new profile whose storage holds only the language
  preference
- **THEN** the host can tap from the setup prompt to the review, and the only
  keys written are the language preference, the game save and the console's own
  night-step recovery aid

#### Scenario: Saved bag registry

- **WHEN** the walk finishes
- **THEN** no saved bag registry key exists and no config file was read

### Requirement: Phone screens avoid horizontal overflow

Every screen on the phone finale path SHALL keep its document scroll width at
or below the viewport width at 360x640 and 640x360.

**Source**: issue #46; `openspec/specs/app/ui-and-privacy/spec.md`
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Narrow portrait

- **WHEN** the setup prompt, bag, player, seat, secrets, night, day, result or
  review renders at 360x640
- **THEN** `document.documentElement.scrollWidth` does not exceed the viewport

#### Scenario: Short landscape

- **WHEN** the same screen renders at 640x360
- **THEN** the document still does not scroll horizontally

### Requirement: Phone controls are touch-sized and unclipped

Every visible link or button on the phone finale path SHALL be at least 44x44
CSS pixels, SHALL stay inside the viewport, and SHALL NOT be clipped by an
`overflow-x: hidden` or `overflow-x: clip` ancestor.

**Source**: issue #46; `openspec/specs/app/ui-and-privacy/spec.md` "touch
targets at least 44 pixels"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Console header

- **WHEN** the console renders at a child viewport
- **THEN** its Undo and Hide buttons are at least 44 px high

#### Scenario: Bag controls

- **WHEN** the bag renders at a child viewport
- **THEN** the count steppers, scenario pills and mode tabs are at least 44 px
  high

#### Scenario: Review table

- **WHEN** the over card opens the role review on a phone
- **THEN** the review table scrolls inside its own container and no link or
  button is clipped by that container

### Requirement: Host choice stays out of public projections

The console SHALL keep the case and the Storyteller reason in the secret
journal, and no case, reason, journal or hidden role SHALL appear in the public
or player projection.

**Source**: Issue #42; `src/ui/AGENTS.md`
**Tests**: `src/core/engine/host-choice.test.ts`

#### Scenario: Public view

- **WHEN** a host choice is recorded
- **THEN** `publicGameView`, `publicSnapshot` and `playerSnapshot` carry no case,
  reason or hidden role

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

### Requirement: Setup routes open without a cover

After `/player` or `/public`, `/bag`, `/seat`, `/secrets` and `/table` SHALL
render directly. The shell SHALL NOT place a cover screen, a warning step or an
extra confirmation between a private route and a setup route, and SHALL NOT
place one between a private route and the console.

**Source**: `SPEC.md` "Screens" (`/player`); issues #142 and #150
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Player handoff to the bag

- **WHEN** the player handoff opens `/bag` after `/player`
- **THEN** the bag renders without a cover heading or a return control

#### Scenario: Browser back from the handoff

- **WHEN** the browser back button returns from `/player` to `/bag`
- **THEN** the bag renders without a cover heading or a return control

#### Scenario: Table overlay unchanged

- **WHEN** `/table` opens after `/player` or `/public`
- **THEN** the console renders without a cover heading, a warning step or a
  reveal control, and the setup routes keep their uncovered rendering

### Requirement: Sheet role legibility

The role sheet SHALL show every role's name and ability in full: no CSS line
clamp, no ellipsis, and no clipped or scrollable text inside the card. The card
SHALL grow to the height the text needs. The role name SHALL render at 16 px or
larger and the ability at 12 px or larger in every sheet language.

**Source**: issue #143; `SPEC.md` "Screens"; `AGENTS.md` "Testing & QA"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Long ability in Russian

- **WHEN** `/sheet/ru` renders all 72 standard roles at 1280 px
- **THEN** the Pit-Hag card shows its complete ability with no ellipsis and no
  clipped content

#### Scenario: Every width and language

- **WHEN** the sheet shows 72 standard roles at 320, 360, 390, 768, 1280 or
  1440 px, with the Travellers toggle on
- **THEN** every card shows ability text equal to the loaded catalog, computed
  `-webkit-line-clamp: none`, no clipped content, name at least 16 px and
  ability at least 12 px

#### Scenario: Read-only behaviour is preserved

- **WHEN** the sheet is filtered, its language is switched, or it is reloaded
- **THEN** the scenario, Travellers and language behaviour is unchanged and the
  saved game stays unmodified

### Requirement: Console opens directly after a private route

`/table` SHALL render the console immediately when it opens after `/player` or
`/public`. The console SHALL expose no hide control, no cover screen, no reveal
control and no warning step, and the route SHALL open no overlay of its own.
Mounting the console SHALL NOT dispatch a command or change the saved game.

**Source**: `SPEC.md` "Screens" (`/table`); issue #150
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Host returns from the player handoff

- **WHEN** the host leaves `/player` for `/table`
- **THEN** the console shows the phase card, and no `[data-act="hide"]`,
  `[data-act="reveal"]` or `[aria-modal="true"]` element exists

#### Scenario: Return from the public screen

- **WHEN** the public screen opens `/table`
- **THEN** the console renders without an intermediate cover and the grimoire
  controls are usable immediately

#### Scenario: Saved game unchanged

- **WHEN** a private route opens `/table`
- **THEN** the saved game and its revision are the same as before the route
  change
