## ADDED Requirements

### Requirement: Private handoff follows the original assignment

The handoff SHALL recheck the revealed player and assignment when rendering a card and before saving a claim.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), Pass Out Character Tokens
**Tests**: `src/ui/screens/player-projection.test.ts`, `scripts/browser-check.ts`

#### Scenario: Open assignment changes

- **WHEN** another window reorders or redeals the selected seat
- **THEN** the picker covers the changed card and the previous selection cannot claim it

### Requirement: Seating editor follows concurrent changes

The editor SHALL adopt a newly saved order while idle and expose a conflict if an unfinished rearrangement would replace another edit.

**Source**: SPEC.md, seat arrangement
**Tests**: `src/ui/screens/seat-projection.test.ts`

#### Scenario: Untouched arrangement

- **WHEN** a second window saves a swap
- **THEN** applying the untouched editor preserves the new order

#### Scenario: Conflicting arrangements

- **WHEN** two windows rearrange the same original order
- **THEN** the second editor can load the saved arrangement before continuing

### Requirement: Accessible library import and custom script restoration

The library SHALL expose the file chooser to keyboard users and the script picker SHALL apply the selected file’s content.

**Source**: SPEC.md, setup library and custom script picker
**Tests**: `scripts/browser-check.ts`

#### Scenario: Restoring an edited pool

- **WHEN** the host edits an imported pool and reapplies the original file
- **THEN** the saved pool matches the roles in the file

#### Scenario: Keyboard library restore

- **WHEN** the focused Import control is activated with the keyboard
- **THEN** the host can choose a library file

### Requirement: Language selection remains consistent

The shell SHALL boot on its target browser baseline and present the most recently selected successful language across the document, controls and catalogs.

**Source**: SPEC.md, localized screens
**Tests**: `src/infrastructure/catalog/load-locale.test.ts`

#### Scenario: Older Safari starts

- **WHEN** Promise.withResolvers is unavailable
- **THEN** the selected catalog still loads

#### Scenario: Competing requests

- **WHEN** a slower language response arrives after the host makes a new selection
- **THEN** the current catalog, control and language preference keep the newer choice

### Requirement: Release shortcuts reach the selected release

The changelog SHALL support native release fragments from its navigation and when opened directly.

**Source**: SPEC.md, version history
**Tests**: `src/infrastructure/routing/history-router.test.ts`

#### Scenario: Fragment navigation

- **WHEN** the host activates a release link or opens its Pages URL directly
- **THEN** the URL retains its fragment and the requested article scrolls into view
