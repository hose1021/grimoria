## ADDED Requirements

### Requirement: Setup undo follows the saved edit

The setup editor SHALL undo only its own applicable saved edit and retain it for retry if persistence fails.

**Source**: SPEC.md, bag editing; [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), Prepare the Grimoire
**Tests**: `scripts/browser-check.ts`

#### Scenario: Setup changed after an edit

- **WHEN** a different window changes or deals the bag after the host edits it
- **THEN** the earlier undo cannot roll back the new setup or erase the deal

### Requirement: A confirmed edit of a dealt bag commits as a single change

After confirmation the setup editor SHALL apply the requested edit to the existing bag and clear the dealt roster in a single persisted command.

**Source**: SPEC.md, bag editing; [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), Secretly Choose Characters
**Tests**: `scripts/browser-check.ts`

#### Scenario: Remove one selected role

- **WHEN** the host confirms removing a role from a dealt bag
- **THEN** the remaining selection is retained, and a rejected write keeps the original deal intact

### Requirement: Pending script imports respect later choices

The script picker SHALL apply only the latest source the host still has open.

**Source**: SPEC.md, custom script import
**Tests**: `scripts/browser-check.ts`

#### Scenario: Late read after changing source

- **WHEN** a previous URL, file or clipboard read finishes after a different choice or dismissal
- **THEN** its result and errors leave the new preview alone

### Requirement: Retain private notes and make copy failures actionable

The table SHALL try to save a pending private note when the browser hides or leaves the page, and SHALL let the host copy an export manually if clipboard access fails.

**Source**: SPEC.md, side panel, notes and backups
**Tests**: `src/entry/notes-lifecycle.test.ts`, `src/ui/screens/table/copy-backup.test.ts`

#### Scenario: Page suspended during a note edit

- **WHEN** the page becomes hidden or leaves before the typing delay expires
- **THEN** the pending note is saved once and a failed attempt keeps the draft available for retry

#### Scenario: Clipboard unavailable or denied

- **WHEN** the host presses Copy and the browser cannot write the private backup to the clipboard
- **THEN** the export dialog selects its full JSON and tells the host how to copy it manually
