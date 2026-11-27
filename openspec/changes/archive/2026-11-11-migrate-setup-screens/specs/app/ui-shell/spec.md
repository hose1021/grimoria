# Spec Delta

## Purpose

Defines the three setup screens as native shell screens: the seat order draft,
the setup secrets editor and the bag editor, with the writer lock and the
snapshot they read.

## ADDED Requirements

### Requirement: Setup screens render in the shell

`/bag`, `/seat` and `/secrets` SHALL render as native shell screens, SHALL
acquire the exclusive writer lock on mount, and SHALL show the writer-busy card
with a retry when another tab holds it. Navigating away SHALL dispose their
listeners, timers and pointer handlers.

**Source**: `SPEC.md` "Screens"; issue #82
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Direct link

- **WHEN** `/bag`, `/seat` or `/secrets` is opened directly
- **THEN** the matching screen renders without the legacy bridge

#### Scenario: Writer busy

- **WHEN** another tab holds the writer lock
- **THEN** the screen shows the busy card and does not render its editor

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
