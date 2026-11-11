# Spec Delta

## Purpose

Defines the `/player` handoff as a native shell screen: the seat picker, the
timed role card, the claim path through a shell port and the hand-back warning.

## ADDED Requirements

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
successful claim. A claim SHALL require the exclusive writer lock; when another
tab holds it, the picker SHALL NOT render and the retry control SHALL be offered.

**Source**: `SPEC.md` `/player`; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `scripts/browser-check.mjs`, `js/commands.test.mjs`

#### Scenario: Empty name

- **WHEN** the name is empty or whitespace
- **THEN** the card stays open and the name field takes focus

#### Scenario: Rejected claim

- **WHEN** the command is rejected, for example for an already claimed seat
- **THEN** the reason is shown and the card stays open

#### Scenario: Writer busy

- **WHEN** another tab holds the writer lock
- **THEN** the picker does not render and the retry control is offered

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
