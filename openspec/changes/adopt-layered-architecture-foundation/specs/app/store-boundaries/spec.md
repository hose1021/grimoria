# Spec Delta

## Purpose

Defines the store as a created object with injected dependencies, the fixed
order of a transaction, the truthfulness of undo, reset and import, the snapshot
contract a React tree can consume, the coordination adapters, and the read
models that keep secret data out of the wrong interface.

## ADDED Requirements

### Requirement: Store factory with injected dependencies

The store SHALL be created by a factory that receives a storage adapter, a
clock, a random source, an id source, a preference adapter and optional browser
coordination. Importing the module SHALL NOT read `localStorage`, register a
global listener or create a game. The store SHALL supply the clock, the id
source and the PRNG seed used by command execution, and SHALL restore any
global it replaces before the call returns.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `js/store.test.mjs`

#### Scenario: Two instances

- **WHEN** two stores are created with different storage adapters
- **THEN** each loads and saves its own game and neither sees the other's write

#### Scenario: Import without a browser

- **WHEN** the factory module is imported in Node with fake adapters
- **THEN** no browser global is required and no game is created until the
  factory is called

### Requirement: Fixed transaction order and publication gate

An accepted command SHALL be normalized, validated, applied on a draft,
invariant-checked, persisted and only then published. On a failed write the
in-memory state SHALL be restored and no subscriber SHALL be notified of the
unconfirmed change.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/store.test.mjs`, `js/commands.test.mjs`

#### Scenario: Persist failure

- **WHEN** the storage adapter throws during a write
- **THEN** the store returns `persist-failed`, the state equals the last saved
  state and no listener observed the draft

#### Scenario: Rejected command

- **WHEN** a command is rejected or needs a Storyteller choice
- **THEN** nothing is written and no snapshot is published

#### Scenario: Accepted command

- **WHEN** a command is accepted and saved
- **THEN** the revision increases once and every listener is notified once

#### Scenario: Preview then dispatch

- **WHEN** a command is previewed and then dispatched from the same initial state
- **THEN** both report the same domain events, because the captured timestamp
  moves with the store rather than with a module-level map

### Requirement: Truthful undo, reset and import

`undo`, `reset` and `importGame` SHALL persist before reporting success. A
failed write SHALL leave the state, the disk and the undo history as they were
and SHALL report the failure.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/store.test.mjs`

#### Scenario: Undo with a failing write

- **WHEN** the write fails during `undo`
- **THEN** the previous state stays active, the history keeps its entry and the
  caller receives a failure

#### Scenario: Import with a failing write

- **WHEN** the write fails during `importGame`
- **THEN** the current game and the stored value are unchanged and the caller
  receives a failure

#### Scenario: Malformed import

- **WHEN** the imported value fails validation
- **THEN** nothing is written and the current game is unchanged

### Requirement: Stable snapshot for external subscribers

The store SHALL expose `subscribe` and `getSnapshot`. `getSnapshot` SHALL
return a cached immutable snapshot whose identity changes only when a new
version is published, so a subscriber that compares by reference does not loop.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `js/store.test.mjs`

#### Scenario: Repeated read

- **WHEN** a subscriber calls `getSnapshot` twice without an intervening change
- **THEN** both calls return the same object

#### Scenario: Publish

- **WHEN** a command is accepted and saved
- **THEN** the next `getSnapshot` returns a different object and its revision is
  one higher

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
- **THEN** the app keeps running with an error message and never reports a
  saved change

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
