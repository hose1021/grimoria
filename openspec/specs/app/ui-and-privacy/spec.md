# UI and Privacy Specification

## Purpose

Defines the static screens, the public and player projections that keep secret
information out, and the key parity the interface relies on.

## Requirements

### Requirement: Route table and fallback

The app SHALL serve the static routes `/bag`, `/seat`, `/secrets`, `/table`,
`/player`, `/public`, `/help`, `/demo`, `/sheet` and `/sheet/{ru,en,az}`, SHALL
fall back to `/table` for an unknown path, and SHALL dispose the previous screen
before mounting the next.

**Source**: `SPEC.md` "Runtime" and "Reliability and live-play additions"
**Tests**: `scripts/browser-check.mjs:1226`

#### Scenario: Unknown path

- **WHEN** the browser opens a path the router does not know
- **THEN** the app renders `/table`

#### Scenario: Route change

- **WHEN** the host navigates from `/table` to `/bag`
- **THEN** the table screen cleanup runs and the bag screen mounts

### Requirement: Public and player privacy

Public and player views SHALL render a projection that contains no real role,
bluff, note or effect, and the player handoff SHALL expose only the shown role.

**Source**: `SPEC.md` "Runtime" and "CSS and accessibility"; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `js/engine.test.mjs:586`, `scripts/browser-check.mjs:758`

#### Scenario: Public screen during a night

- **WHEN** the public screen is open during an active night
- **THEN** it shows phase, alive count, public deaths and no role or bluff element

#### Scenario: Export projection

- **WHEN** the public projection is built from a saved game
- **THEN** it contains no role, bluff, note or effect field

### Requirement: Interface string parity

The English, Russian and Azerbaijani UI catalogs SHALL have matching keys and
parameters, and role names SHALL come from the role catalog rather than
hardcoded translations.

**Source**: `SPEC.md` "Screens"; `AGENTS.md` "Code Conventions"
**Tests**: `js/strings.test.mjs:5`

#### Scenario: Missing key

- **WHEN** a key exists in one catalog and not another
- **THEN** the parity check reports the difference

### Requirement: Role sheet scenario filter

The role sheet SHALL filter by Trouble Brewing, Bad Moon Rising, Sects and
Violets or all standard roles, SHALL show the 5 Travellers in a separate
section, SHALL persist the filter across language change and reload, and SHALL
never mutate the saved game.

**Source**: `SPEC.md` `/sheet/{ru,en,az}`
**Tests**: `scripts/browser-check.mjs:821`, `scripts/browser-check.mjs:1226`

#### Scenario: Scenario selection

- **WHEN** the host selects Bad Moon Rising on the sheet
- **THEN** the sheet shows its 25 roles with the four standard team sections

#### Scenario: Travellers section

- **WHEN** the host opens the Travellers toggle
- **THEN** the 5 Travellers appear outside the scenario count

### Requirement: Minimum viewport and accessibility

Screens SHALL avoid horizontal overflow at 360 to 390 pixels, keep touch
targets at least 44 pixels, keep visible focus, label controls, and show secret
states with text and icons rather than colour alone.

**Source**: `SPEC.md` "CSS and accessibility"
**Tests**: `scripts/browser-check.mjs:1226`

#### Scenario: Phone width

- **WHEN** a screen renders at 390 pixels wide
- **THEN** the document does not scroll horizontally

### Requirement: Application identity and logo

The app SHALL present itself as Grimoria: the document title, the web app
manifest name and short name, the README and the in-app brand labels SHALL use
that name. The app SHALL show the Grimoria mark as the favicon, the manifest
icon and the compact brand on the table, setup, role-sheet and help screens.
The mark SHALL be decorative where the adjacent text already names the app.

**Source**: [Issue #54](https://github.com/hose1021/grimoria/issues/54)
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Page identity

- **WHEN** the browser opens any route
- **THEN** the document title is `Grimoria` and the manifest name is `Grimoria`

#### Scenario: Header brand

- **WHEN** the table, setup, role-sheet or help screen renders
- **THEN** it shows the Grimoria mark and no `PG` text mark

#### Scenario: Install icon

- **WHEN** the browser reads the manifest and caches the app shell
- **THEN** the icon is the square Grimoria mark and it is part of the precache

### Requirement: Download file naming

A game or library export downloaded by the host SHALL use a `grimoria-` file
name prefix, and the file SHALL keep the existing export format identifiers so
an earlier export still imports unchanged.

**Source**: [Issue #54](https://github.com/hose1021/grimoria/issues/54)
**Tests**: `scripts/browser-check.mjs`, `js/library.test.mjs`

#### Scenario: Game export download

- **WHEN** the host downloads a game export
- **THEN** the suggested file name starts with `grimoria-` and the JSON keeps the `pocket-grimoire` format

#### Scenario: Earlier export still imports

- **WHEN** the host imports a game exported before the rename
- **THEN** the import succeeds with the stored format identifier unchanged
