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
**Tests**: `js/store.test.mjs`, `scripts/browser-check.mjs`

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
screen SHALL be read-only: it SHALL NOT dispatch commands or persist anything.

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

### Requirement: Shell styles without a global reset

The built artifact SHALL ship the shell's styles itself, with no CDN and no
external request at run time. Adopting the shell SHALL NOT apply a global reset
to the legacy screens until the legacy stylesheet is retired.

**Source**: `AGENTS.md` "Runtime/Tooling Preferences"; issue #69
**Tests**: `scripts/browser-check.mjs`, `js/offline-worker.test.mjs`

#### Scenario: Offline load

- **WHEN** the app loads from the service worker with the network disabled
- **THEN** the shell's styles are available and no request leaves the origin

#### Scenario: Legacy screen unchanged

- **WHEN** a legacy route renders next to a shell route
- **THEN** its computed typography and spacing match the pre-shell build

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
**Tests**: `scripts/browser-check.mjs`, `js/commands.test.mjs`

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

### Requirement: Setup screens keep their stylesheets

The three setup screens SHALL keep their current class names and markup, so
`css/bag.css`, `css/seat.css` and `css/setup.css` SHALL remain the only style
source for them in this change. A later change converts them to utilities and
proves the computed styles.

**Source**: `AGENTS.md` "Code Conventions"; issue #82
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Narrow layout

- **WHEN** `/bag`, `/seat` or `/secrets` renders at 360 px
- **THEN** neither the page nor the seat ring overflows horizontally
