# Spec Delta

## Purpose

Defines the phone-viewport acceptance path for the shell: how the host reaches
the finale from a clean installation, and the layout limits every screen on
that path must keep.

## ADDED Requirements

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
