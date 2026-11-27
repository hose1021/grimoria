# Spec Delta

## ADDED Requirements

### Requirement: Application identity and logo

The app SHALL present itself as Grimoria: the document title, the web app
manifest name and short name, the README and the in-app brand labels SHALL use
that name. The app SHALL show the Grimoria mark as the favicon, the manifest
icon and the compact brand on the table, setup, role-sheet and help screens.
The mark SHALL be decorative where the adjacent text already names the app.

**Source**: [Issue #54](https://github.com/hose1021/pocket-grimoire-go/issues/54)
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

**Source**: [Issue #54](https://github.com/hose1021/pocket-grimoire-go/issues/54)
**Tests**: `scripts/browser-check.mjs`, `js/library.test.mjs`

#### Scenario: Game export download

- **WHEN** the host downloads a game export
- **THEN** the suggested file name starts with `grimoria-` and the JSON keeps the `pocket-grimoire` format

#### Scenario: Earlier export still imports

- **WHEN** the host imports a game exported before the rename
- **THEN** the import succeeds with the stored format identifier unchanged
