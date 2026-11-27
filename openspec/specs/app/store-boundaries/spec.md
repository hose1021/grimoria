# app/store-boundaries Specification

## Purpose
Defines the store as a created object with injected dependencies, the fixed
order of a transaction, what a subscriber may observe after a failed write, the
truthfulness of undo, reset and import behind the legacy facade, the two
snapshot identities, and the read models that keep secret data out of the wrong
interface.

## Requirements

### Requirement: Store factory, ports and injected dependencies

The store SHALL be created by a factory that receives its dependencies: a
storage adapter, a clock, an id source, a random source and a preference
adapter. Importing the module SHALL NOT read
`localStorage`, register a global listener or create a game. The clock, id
source and seed types SHALL live in `core`; storage and preferences SHALL live
in `application`.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #59
**Tests**: `src/entry/store.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Two instances

- **WHEN** two stores are created with different storage adapters
- **THEN** each loads and saves its own game and neither sees the other's write

#### Scenario: Import without a browser

- **WHEN** the factory module is imported in Node with fake adapters
- **THEN** no browser global is required and no game is created until the
  factory is called

#### Scenario: Core does not import application

- **WHEN** a `core` module needs the clock or an id source
- **THEN** it imports the core port type, and the architecture check rejects an
  import from `application`

#### Scenario: No engine parameter

- **WHEN** a caller creates a store
- **THEN** the factory accepts no command executor and no save codec, because it
  imports both from `core`

### Requirement: Transitional command and save-format ports

The `CommandExecutor` and `StateCodec` ports SHALL be removed. The command
registry (`validate`, `preview`, `apply`, the ruleset version and the accepted
versions) and the save codec (`create`, `parse`, `exportGame`, `importGame`)
SHALL be exported from `core`, and `application` SHALL import them directly.
The composition root SHALL bind only storage, preferences and
platform, and `js/composition.js` SHALL disappear.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #59
**Tests**: `src/entry/store.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Legacy execution is wired once

- **WHEN** the store applies or previews a command
- **THEN** it calls the registry imported from `core`, and `js/composition.js`
  no longer wires an executor or a codec

#### Scenario: Ports are transitional

- **WHEN** the engine and model live in `core`
- **THEN** the `CommandExecutor` and `StateCodec` ports are removed rather than
  kept as a second engine

#### Scenario: No second engine

- **WHEN** a search runs over `src` for a port that forwards to `js/`
- **THEN** no `CommandExecutor` or `StateCodec` definition or implementation
  remains

#### Scenario: Application imports core

- **WHEN** the store validates, previews or applies a command
- **THEN** it calls the core registry directly, and no module in `src` imports
  `js/`

### Requirement: Transaction order and publication

An accepted command SHALL be prepared, validated, applied on a draft,
invariant-checked, persisted and only then published. A persist failure SHALL
restore the in-memory game and SHALL never publish the draft. The same rule
SHALL cover `reset`, `replaceState` and `importGame`: a failed write SHALL
restore the game and history before publishing one failed status.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `src/entry/store.test.ts`, `src/core/engine/commands.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Persist failure

- **WHEN** the storage adapter throws during a write
- **THEN** the store returns `persist-failed`, the game equals the last saved
  game and no subscriber observed the draft

#### Scenario: Rejected command

- **WHEN** a command is rejected or needs a Storyteller choice
- **THEN** nothing is written and no snapshot is published

#### Scenario: Accepted command

- **WHEN** a command is accepted and saved
- **THEN** the game revision increases once, the snapshot changes once and every
  listener is notified once

#### Scenario: Replacement persist failure

- **WHEN** `reset`, `replaceState` or `importGame` cannot write because the
  adapter throws or another tab changed the disk
- **THEN** the game and history are restored, one failed status is published,
  and no subscriber observes the replacement state

### Requirement: Save status is observable

The snapshot SHALL expose a save status independent of the game. A failed write
SHALL publish a new snapshot with the unchanged game state, the unchanged game
revision and a failed status, and SHALL notify subscribers.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `src/entry/store.test.ts`

#### Scenario: First failure

- **WHEN** the first write of a session fails
- **THEN** the next `getSnapshot` has the same state reference and game
  revision, `save.status === "failed"` with the error, and a higher view
  version, and every listener was notified

#### Scenario: Repeated failure

- **WHEN** a second write fails with the same message
- **THEN** no new snapshot is published and the view version stays

#### Scenario: Recovery

- **WHEN** a later write succeeds
- **THEN** the snapshot reports a saved status, the game revision follows the
  written revision, and the view version increases

#### Scenario: Legacy banner

- **WHEN** the legacy facade is in use and a write fails
- **THEN** the saved game object carries the error and the existing storage
  banner subscriber renders it without an edit to the screen

### Requirement: Truthful undo, reset and import

`undo`, `reset`, `replaceState` and `importGame` SHALL persist before reporting
success. A failed write SHALL leave the game, the stored value and the undo
history unchanged and SHALL report the failure.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `src/entry/store.test.ts`

#### Scenario: Undo with a failing write

- **WHEN** the write fails during `undo`
- **THEN** the previous state stays active, the history keeps its entry and the
  caller receives a failure

#### Scenario: Legacy boolean

- **WHEN** the legacy facade's `undo()` is called and the write fails
- **THEN** it returns `false`, so the existing `if (undo())` branch in the table
  screen does not run

#### Scenario: Import with a failing write

- **WHEN** the write fails during `importGame`
- **THEN** the current game and the stored value are unchanged and the caller
  receives a failure

#### Scenario: Malformed import

- **WHEN** the imported value fails validation
- **THEN** nothing is written and the current game is unchanged

### Requirement: Two snapshot identities

The snapshot SHALL expose a game revision that moves only with a written game
and a view version that moves on every publish. `getSnapshot` SHALL return a
cached object whose identity changes only at a publish, and the revision in the
written value SHALL equal the reported game revision.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `src/entry/store.test.ts`

#### Scenario: Repeated read

- **WHEN** a subscriber calls `getSnapshot` twice without a publish
- **THEN** both calls return the same object

#### Scenario: Game publish

- **WHEN** a command is accepted and saved
- **THEN** the next snapshot is a different object, its game revision is one
  higher and the written value carries that revision

#### Scenario: Status-only publish

- **WHEN** only the save status changes
- **THEN** the snapshot is a different object, the game revision and the state
  reference are unchanged and the view version is higher

#### Scenario: Throwing subscriber

- **WHEN** one listener throws
- **THEN** the other listeners are still notified and the store stays usable

### Requirement: Injected coordination and storage outage

Other windows SHALL coordinate through injected ports: a storage event SHALL
deliver a newer save to every open window. A write from a store whose last
observed value differs from the stored value SHALL be refused. An unavailable
storage backend SHALL leave the app usable with a visible error and SHALL NOT
report a saved state.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `src/entry/store.test.ts`

#### Scenario: Stale window

- **WHEN** a store holds an older snapshot than the stored value
- **THEN** its write is refused and the stored game is unchanged

#### Scenario: Newer save from another window

- **WHEN** a valid newer save arrives through a storage event
- **THEN** it is adopted, the undo history is cleared and the snapshot is
  published once

#### Scenario: Storage unavailable

- **WHEN** the adapter reports that storage cannot be read or written
- **THEN** the app keeps running with an error status and never reports a saved
  change

### Requirement: Read models are projections

The store SHALL expose read models only through pure projection functions. The
public model SHALL contain no role, shown role, bluff, note or effect. The
player model for a seat SHALL contain only the shown role and that seat's public
fields.

**Source**: `SPEC.md` "Runtime" and "CSS and accessibility"; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `src/core/engine/engine.test.ts`, `src/entry/store.test.ts`

#### Scenario: Public model during a night

- **WHEN** the public model is built from a state with an active night
- **THEN** it contains phase, counts, public deaths and the winner only

#### Scenario: Player model

- **WHEN** the player model is built for a seat
- **THEN** its role comes from the shown role and no other seat's role is
  reachable

#### Scenario: Demo isolation

- **WHEN** the demo game runs
- **THEN** it uses its own state object and the stored game is unchanged

### Requirement: Safe recovery of a damaged setup library

The host SHALL be able to restore a valid export over a damaged library after preserving the original bytes. A dismissed or superseded file import SHALL leave the library unchanged.

**Source**: SPEC.md, setup library and reliable persistence
**Tests**: `src/infrastructure/library/bag-library.test.ts`, `scripts/browser-check.ts`

#### Scenario: Restore when the saved library cannot be parsed

- **WHEN** the host imports a valid backup over the same damaged value they opened
- **THEN** the original is backed up before the replacement and a backup or storage failure leaves the original intact for retry

#### Scenario: The library changes before an import commits

- **WHEN** another window writes a new library or the host closes the dialog or chooses a newer file
- **THEN** the obsolete import cannot overwrite the saved library

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

### Requirement: Keep the only recoverable copy of damaged data

The store SHALL preserve unreadable primary bytes until a recovery copy is successfully stored.

**Source**: SPEC.md, State v4 and corrupt save recovery
**Tests**: `src/application/store/create-game-store.test.ts`

#### Scenario: Backup storage is full

- **WHEN** saving a broken primary under the backup key fails and a smaller replacement would fit
- **THEN** the original remains intact, the error remains visible and the host can retry after freeing space

### Requirement: History controls observe committed history

The store SHALL expose the new undo and redo availability when it publishes a successful history operation.

**Source**: SPEC.md, undo and redo
**Tests**: `src/application/store/create-game-store.test.ts`

#### Scenario: Immediate observation

- **WHEN** a subscriber reads history during an undo or redo notification
- **THEN** the controls reflect the committed operation and failed writes preserve the previous history

### Requirement: Recovery preserves playable sessions and distinct originals

The store SHALL retain a running game when the primary save becomes unreadable and SHALL accept a subsequent valid repair in an unedited window. Reopening the same damaged bytes SHALL reuse their recovery copy and distinct damaged values SHALL remain independently recoverable.

**Source**: SPEC.md, persistence and cross-tab recovery
**Tests**: `src/infrastructure/adapters.test.ts`, `src/application/store/create-game-store.test.ts`, `src/entry/store.test.ts`

#### Scenario: Damage then repair from a second window

- **WHEN** the primary becomes invalid while a playable game is open
- **THEN** the host can still export the playable game and a clean window can adopt a valid repair

#### Scenario: Repeated recovery

- **WHEN** the damaged save is opened repeatedly or two distinct recoveries share a timestamp
- **THEN** identical bytes share a backup and different originals remain available
