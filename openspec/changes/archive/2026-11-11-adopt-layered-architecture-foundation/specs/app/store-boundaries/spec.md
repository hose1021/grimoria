# Spec Delta

## Purpose

Defines the store as a created object with injected dependencies, the fixed
order of a transaction, what a subscriber may observe after a failed write, the
truthfulness of undo, reset and import behind the legacy facade, the two
snapshot identities, the coordination adapters, and the read models that keep
secret data out of the wrong interface.

## ADDED Requirements

### Requirement: Store factory, ports and injected dependencies

The store SHALL be created by a factory that receives its dependencies: a
storage adapter, a clock, an id source, a random source, a preference adapter,
optional browser coordination, and the two ports below. Importing the module
SHALL NOT read `localStorage`, register a global listener or create a game. The
clock, id source and seed types SHALL live in `core`; storage, coordination,
preferences and the two ports SHALL live in `application`.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `js/store.test.mjs`

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

### Requirement: Transitional command and save-format ports

`CommandExecutor` SHALL expose `validate`, `preview` and `apply` plus the
ruleset version and the accepted versions. `StateCodec` SHALL expose `create`,
`parse`, `exportGame` and `importGame`. The legacy implementations SHALL be
bound only in the composition root; `core` SHALL NOT import them, and
`application` SHALL NOT value-import the legacy tree.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #52
**Tests**: `js/store.test.mjs`

#### Scenario: Legacy execution is wired once

- **WHEN** the store applies or previews a command
- **THEN** it calls the injected `CommandExecutor`, and neither `core` nor
  `application` imports `js/`

#### Scenario: Ports are transitional

- **WHEN** the engine and model live in `core`
- **THEN** the `CommandExecutor` and `StateCodec` ports are removed rather than
  kept as a second engine

### Requirement: Transaction order and publication

An accepted command SHALL be prepared, validated, applied on a draft,
invariant-checked, persisted and only then published. A persist failure SHALL
restore the in-memory game and SHALL never publish the draft.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/store.test.mjs`, `js/commands.test.mjs`

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

### Requirement: Save status is observable

The snapshot SHALL expose a save status independent of the game. A failed write
SHALL publish a new snapshot with the unchanged game state, the unchanged game
revision and a failed status, and SHALL notify subscribers.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `js/store.test.mjs`

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
**Tests**: `js/store.test.mjs`

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
**Tests**: `js/store.test.mjs`

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

Coordination with other windows SHALL be an injected adapter: a writer lock
where the browser supports it, storage events where it does not. A write from a
store whose last observed value differs from the stored value SHALL be refused.
An unavailable storage backend SHALL leave the app usable with a visible error
and SHALL NOT report a saved state.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/store.test.mjs`

#### Scenario: Stale window

- **WHEN** a store holds an older snapshot than the stored value
- **THEN** its write is refused and the stored game is unchanged

#### Scenario: Newer save from another window

- **WHEN** a valid newer save arrives through the coordination adapter
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
**Tests**: `js/engine.test.mjs`, `js/store.test.mjs`

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
