# Spec Delta

## Purpose

Removes the two transitional ports now that the engine and the model live in
`core`, and states what the store factory takes as dependencies afterwards.

## MODIFIED Requirements

### Requirement: Store factory, ports and injected dependencies

The store SHALL be created by a factory that receives its dependencies: a
storage adapter, a clock, an id source, a random source, a preference adapter
and optional browser coordination. Importing the module SHALL NOT read
`localStorage`, register a global listener or create a game. The clock, id
source and seed types SHALL live in `core`; storage, coordination and
preferences SHALL live in `application`. The factory SHALL import the command
registry and the save codec from `core` instead of receiving them as
parameters.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #59
**Tests**: `js/store.test.mjs`, `src/application/store/create-game-store.test.ts`

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
The composition root SHALL bind only storage, coordination, preferences and
platform, and `js/composition.js` SHALL disappear.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #59
**Tests**: `js/store.test.mjs`, `src/application/store/create-game-store.test.ts`

#### Scenario: No second engine

- **WHEN** a search runs over `src` for a port that forwards to `js/`
- **THEN** no `CommandExecutor` or `StateCodec` definition or implementation
  remains

#### Scenario: Application imports core

- **WHEN** the store validates, previews or applies a command
- **THEN** it calls the core registry directly, and no module in `src` imports
  `js/`
