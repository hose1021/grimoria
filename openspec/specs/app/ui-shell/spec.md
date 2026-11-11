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
