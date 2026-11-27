## ADDED Requirements

### Requirement: Startup and synchronization tolerate storage failures

The store SHALL distinguish an untouched initial game from an unpersisted edit and keep the shell usable when storage access is denied.

**Source**: SPEC.md, reliability and save failures
**Tests**: `src/infrastructure/adapters.test.ts`, `src/application/store/create-game-store.test.ts`, `src/entry/store.test.ts`, `scripts/browser-check.ts`

#### Scenario: Blocked storage

- **WHEN** the browser rejects even obtaining localStorage
- **THEN** read-only routes remain available and the app reports the storage problem

#### Scenario: First save across windows

- **WHEN** a second untouched window receives the first saved game
- **THEN** it adopts that game and can continue saving

#### Scenario: Two empty setup windows race to initialize

- **WHEN** another window commits the first save just before an untouched setup window initializes its bag
- **THEN** the later window adopts the committed game and never replays its rejected command against that game

#### Scenario: External replacement while the host is typing

- **WHEN** adopting an external save would discard an unfinished host note
- **THEN** the pending note remains available for recovery and export

### Requirement: Recovery export includes pending notes

A game backup SHALL include the latest pending host note in both its current state and its replay history.

**Source**: SPEC.md, complete private backup
**Tests**: `src/application/store/create-game-store.test.ts`

#### Scenario: Note write failed

- **WHEN** the host exports a note after saving fails
- **THEN** the exported backup recovers that note on import and replay

### Requirement: Concurrent library edits preserve saved entries

Independent saves SHALL merge into the current library and stale edits to the same entry SHALL surface a conflict.

**Source**: SPEC.md, persistent setup library
**Tests**: `src/infrastructure/library/bag-library.test.ts`

#### Scenario: Two independent additions

- **WHEN** two open library views each save a different entry
- **THEN** both entries survive reopening the library

#### Scenario: Conflicting edits

- **WHEN** two views save different edits to the same saved entry
- **THEN** the second save reports the conflict and preserves the first edit

### Requirement: Command execution is atomic and runs once

Dispatch SHALL execute an accepted command once and publish the resulting state only after successful persistence.

**Source**: SPEC.md, command transaction and replay
**Tests**: `src/application/store/create-game-store.test.ts`

#### Scenario: Apply and retry

- **WHEN** the host dispatches an accepted command and retries its ID
- **THEN** the first dispatch executes once and the retry reuses the recorded result

#### Scenario: Failed write

- **WHEN** persistence fails after the command draft is evaluated
- **THEN** subscribers retain the last committed game and receive the save failure
