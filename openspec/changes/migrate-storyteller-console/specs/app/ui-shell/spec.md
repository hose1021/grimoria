# Spec Delta

## ADDED Requirements

### Requirement: Storyteller console renders in the shell

`/table` SHALL render as a native shell screen and SHALL NOT mount through the
legacy bridge. It SHALL acquire the exclusive writer lock, SHALL show the shared
writer-busy card with a retry when another tab holds it, and SHALL dispose its
listeners and timer when the route changes.

**Source**: `SPEC.md` "Screens"; `docs/architecture.md` "Migration map"; issue #85
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Direct link

- **WHEN** `/table` is opened directly
- **THEN** the console renders without the legacy bridge and owns the saved game

#### Scenario: Writer busy

- **WHEN** another tab holds the writer lock
- **THEN** the console does not render and the retry control is offered

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
**Tests**: `scripts/browser-check.mjs`, `js/engine.test.mjs`

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
**Tests**: `scripts/browser-check.mjs`, `js/engine.test.mjs`

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
**Tests**: `scripts/browser-check.mjs`, `js/bmr.test.mjs`, `js/snv.test.mjs`

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
**Tests**: `scripts/browser-check.mjs`, `js/commands.test.mjs`

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

### Requirement: Hidden console after a private route

When the console opens after `/player` or `/public`, it SHALL start behind the
hide overlay and SHALL reveal the grimoire only from the reveal control. Escape
SHALL close every overlay.

**Source**: `SPEC.md` "Screens" (`/table`); `SPEC.md` "Reliability and live-play additions"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Covered start

- **WHEN** the host returns from the player handoff to `/table`
- **THEN** the hide overlay covers the console

#### Scenario: Escape

- **WHEN** an overlay is open and the host presses Escape
- **THEN** the overlay closes and the phase card returns

### Requirement: Console styles without legacy stylesheets

The console SHALL be styled by Tailwind utilities and tokens only, with no
`host-*` or `tbl-*` rule left for it. `/help` and `/demo` SHALL keep their own
`help-*` and `demo-*` rules, their shared primitives and their responsive
blocks after the console stylesheet is deleted.

**Source**: `AGENTS.md` "Runtime/Tooling Preferences"; `docs/architecture.md` "UI shell"
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Phone width

- **WHEN** the console renders at 390 pixels
- **THEN** the document does not scroll horizontally

#### Scenario: Demo and help

- **WHEN** `/demo` and `/help` render after the migration
- **THEN** their grids, card and seat sizes, alert and log blocks and their
  responsive layout keep the pre-migration computed styles
