## ADDED Requirements

### Requirement: Game-end chronicle

The over card SHALL show the complete narrative log below the review table,
grouped by its phase and keeping the night, day and death filters. The chronicle
SHALL be rebuilt from the saved log after export and import. The side panel
SHALL keep its eight-entry preview.

**Source**: [Issue #489](https://github.com/hose1021/grimoria/issues/489); `SPEC.md` "Screens" (`/table`)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Finished game shows the chronicle

- **WHEN** the game ends and the host opens the review
- **THEN** the over card shows every recorded log entry, not only the last eight

#### Scenario: Filters stay

- **WHEN** the host filters the chronicle to night or deaths
- **THEN** the over card shows only the matching entries

#### Scenario: Export and import keep the chronicle

- **WHEN** a finished game is exported and imported
- **THEN** the over card shows the same entries in the same order
