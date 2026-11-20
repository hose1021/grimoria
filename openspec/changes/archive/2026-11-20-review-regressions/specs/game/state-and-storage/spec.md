## ADDED Requirements

### Requirement: Validate external effect collections and journal bases

The save codec SHALL reject malformed effect collections without throwing
and SHALL reject a non-null journal base unless it is a valid game state.
Malformed imports SHALL leave the current game and persisted save unchanged.
Loading such a save SHALL use existing corrupt-save backup and recovery.

**Source**: `SPEC.md` "State v4"; issue #200's storage and replay contracts.
**Tests**: `src/core/model/state.test.ts`, `src/application/store/create-game-store.test.ts`, `src/core/engine/commands.test.ts`

#### Scenario: Malformed effects on load

- **WHEN** a saved v4 game's effects field is an object or string
- **THEN** startup reports a load failure, backs up the raw value and exposes a
  usable fresh game without overwriting the raw save

#### Scenario: Invalid journal base

- **WHEN** a saved or imported game has an empty object as its journal base
- **THEN** validation rejects it before undo can persist an incomplete game

#### Scenario: Valid historical save

- **WHEN** a valid save lacks a journal or contains a valid base without a nested journal
- **THEN** it remains compatible with schema v4 and normal undo remains usable
