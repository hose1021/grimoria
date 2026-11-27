# Spec Delta

## MODIFIED Requirements

### Requirement: Correction reason and over panel

A correction SHALL require a reason. The over panel SHALL hide the review table
until used and SHALL require a second confirmation before a new game. After the
confirmed new game, the console SHALL publish the fresh game before it leaves
`/table`; no finished-game table, phase or review state SHALL remain visible.
The notes field SHALL commit its draft after a pause, on blur and on unmount,
not on every character.

**Source**: `SPEC.md` "Screens" (`/table`); issue #42; [Issue #170](https://github.com/hose1021/grimoria/issues/170)
**Tests**: `scripts/browser-check.ts`, `src/core/engine/commands.test.ts`

#### Scenario: Correction reason

- **WHEN** a correction is applied without a reason
- **THEN** the dialog stays open and the reason field is reported

#### Scenario: Notes commit

- **WHEN** the host types 100 characters into the notes field without leaving it
- **THEN** at most one command is journaled, the whole note is stored after the
  pause, and it survives a reload

#### Scenario: Review gate

- **WHEN** the game is over
- **THEN** the review table stays hidden until the review control is used

#### Scenario: New game

- **WHEN** the new game control is used once
- **THEN** the game is unchanged and the confirmation is shown

#### Scenario: New game clears the table

- **WHEN** the host confirms the new game and the console returns to the table
- **THEN** the table shows the fresh setup and no finished-game table, phase or
  review state
