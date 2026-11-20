# app/architecture-layers Specification

## Purpose
Defines the four-layer split of the single static application: what each layer
owns, which imports are legal, which directories are production and which are
tests, how far the automated check reaches, and the coexistence rule that keeps
one game state while two interfaces exist.

## Requirements

### Requirement: Layer ownership and allowed imports

The application SHALL be split into `src/core`, `src/application`,
`src/infrastructure` and `src/ui`, and the import direction SHALL be:
`core` imports only `core`, `src/data` and the type-only core ports;
`application` imports `core` and itself; `infrastructure` imports `application`
and `core`; `ui` imports `application` and `core` read-model types; the
composition root imports all four. Every runtime module SHALL live in one of
these layers or in the composition root.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #59, issue #132
**Tests**: `scripts/check-types-policy.test.ts`, `src/core/model/types.test-d.ts`

#### Scenario: Core stays pure

- **WHEN** a `src/core` module imports an `application`, `infrastructure` or
  `ui` module
- **THEN** the architecture check fails and names the file and the specifier

#### Scenario: Ports live in the right layer

- **WHEN** `core` needs a clock or an id source
- **THEN** it imports the core port type, and a `core` import of
  `src/application/ports` fails the check

#### Scenario: Application avoids the browser

- **WHEN** a `src/application` module imports a concrete storage adapter or the
  `ui` layer
- **THEN** the architecture check fails

#### Scenario: One composition root

- **WHEN** a module outside the entry point constructs an infrastructure
  implementation
- **THEN** the architecture check fails

### Requirement: Domain ownership and legacy isolation

The game rules, the state model, the script catalog and the effect graph SHALL
live in `core`. The JavaScript tree `js/` SHALL NOT exist; every runtime
module SHALL live in a layer, and no import specifier, build configuration,
lint scope, type program or script SHALL name the retired tree as a live path.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #59, issue #132
**Tests**: `scripts/check-types-policy.test.ts`,
`src/core/model/presets.test.ts`

#### Scenario: The legacy tree is not a dependency

- **WHEN** any file under `src` or `scripts` imports a path under `js/`,
  including an `import type`
- **THEN** the architecture check fails and names the file and the specifier

#### Scenario: Retired tree is absent

- **WHEN** the repository is checked after the migration
- **THEN** `js/` does not exist and no configuration or script lists a `js/`
  glob

#### Scenario: Shims re-export the whole surface

- **WHEN** the shims are deleted
- **THEN** the browser test entry and the moved tests import their modules
  directly, and the suite fails at import time if a public name is lost

#### Scenario: Tests follow their modules

- **WHEN** a runtime module moves into a layer
- **THEN** its asserting test moves beside it and is still run by `npm test`

### Requirement: Browser globals confined to the outer layers

`src/core` and `src/application` SHALL NOT reference `window`, `document`,
`localStorage`, `sessionStorage`, `navigator`, `Date.now` or a `node:*` module.
They SHALL compile under a TypeScript configuration without DOM or Node
libraries.

**Source**: `SPEC.md` "Runtime"; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `src/core/model/types.test-d.ts`, `scripts/check-types-policy.test.ts`

#### Scenario: DOM type in core

- **WHEN** a `src/core` module reads `document`
- **THEN** the core type-check fails because the DOM library is absent

#### Scenario: Browser global by name

- **WHEN** a `src/application` module references `localStorage` without a DOM
  library
- **THEN** the architecture check reports it before the run reaches the browser

### Requirement: Production and test source sets

The project SHALL define a production set and a disjoint test set under `src/`.
Production configurations SHALL exclude `*.test.ts`, `*.test-d.ts` and test
fixtures and SHALL keep `types: []`; the test configuration SHALL include those
files with Node types. Test files SHALL NOT be reachable from production code,
and no test SHALL live outside `src/`.

**Source**: `AGENTS.md` "Development Commands"; issue #52, issue #132
**Tests**: `scripts/check-types-policy.test.ts`, `src/core/model/types.test-d.ts`

#### Scenario: Node types stay in tests

- **WHEN** a production `src` file imports `node:test`
- **THEN** the architecture check fails and the production type-check fails
  because Node types are not enabled there

#### Scenario: Tests type-check

- **WHEN** `npm run typecheck` runs
- **THEN** the test configuration also runs, and a type error in a `*.test.ts`
  file fails the command

#### Scenario: Test code does not leak

- **WHEN** a non-test module imports a `*.test.ts`, `*.test-d.ts` or fixture
  path
- **THEN** the architecture check fails

#### Scenario: Core tests stay browser-free

- **WHEN** a test beside a `core` module imports `infrastructure`
- **THEN** the check fails, so the pure suite keeps running without adapters

#### Scenario: No test tree outside src

- **WHEN** the test glob and the test type program are read
- **THEN** both include `src/**` only, because the legacy test directory is
  deleted

### Requirement: Automated boundary check

A repository check SHALL parse every static import and export form in `src`,
classify the specifier, and reject a forbidden edge or a reference to the
retired `js/` tree. It SHALL be exercised by negative fixtures that prove each
rule can fail, and it SHALL document which bypasses a textual scan cannot
detect.

**Source**: `AGENTS.md` "Development Commands"; issue #52, issue #132
**Tests**: `scripts/check-types-policy.test.ts`

#### Scenario: Covered specifier forms

- **WHEN** a file uses an import, a side-effect import, `export … from`,
  `export * from`, `import type` or a literal dynamic `import()`
- **THEN** the specifier is extracted and classified

#### Scenario: Non-literal dynamic import

- **WHEN** `core` or `application` calls `import()` with a non-literal argument
- **THEN** the check fails, because the dependency cannot be resolved
  statically

#### Scenario: Fixture per rule

- **WHEN** the check runs against a fixture with a forbidden edge or a forbidden
  token
- **THEN** it exits non-zero and the test asserts the message

#### Scenario: Clean tree

- **WHEN** no module crosses a boundary
- **THEN** the check exits zero and the pipeline continues

#### Scenario: Stated limit

- **WHEN** the check's documentation is read
- **THEN** it names the bypasses it cannot prove absent (a cast through a
  helper, a runtime-assembled specifier in `ui`, `Object.assign`) and says that
  review is the second control

### Requirement: Single game state during coexistence

While legacy screens and migrated routes coexist, both SHALL read and mutate one
store instance, and exactly one owner SHALL render a route at a time.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `scripts/browser-check.ts`, `src/entry/store.test.ts`

#### Scenario: Action on one route is visible on another

- **WHEN** a command is accepted on one route and the host navigates to another
- **THEN** both render the same saved state without a reload

#### Scenario: Route handover

- **WHEN** a route moves from the legacy renderer to the migrated renderer
- **THEN** exactly one of them mounts and the previous one is disposed

### Requirement: Preference storage has one owner

Language, guidance and role-sheet preferences SHALL be read and written through
one adapter, and no screen SHALL write the game key.

**Source**: `SPEC.md` "Runtime" and "Screens"; `AGENTS.md` "Code Conventions"
**Tests**: `src/entry/store.test.ts`, `scripts/browser-check.ts`

#### Scenario: Language switch

- **WHEN** the host changes the language
- **THEN** the preference is written once through the adapter and survives a
  reload

#### Scenario: Game key untouched

- **WHEN** a preference changes on any screen
- **THEN** the saved game value is byte-identical

### Requirement: One coordinator owns the resolution order

The engine SHALL resolve an action in one coordinator in this order: intent,
attack, protection and redirect, death or execution, on-death and character
change, win. It SHALL reuse `effects.ts` for protection, `death.ts` for attack,
death, succession and win, and `retention.ts` for retained ability. It SHALL
keep `state.log`, `state.journal`, `state.applied` and derived `DomainEvent[]`
as the only history. It SHALL NOT add an event bus, a second journal or a
second death path.

**Source**: `docs/adr/0002-engine-contracts.md` §3; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/commands.test.ts`, `src/core/engine/invariants.test.ts`

#### Scenario: Attack resolution stays ordered

- **WHEN** an attack is blocked, redirected or lethal
- **THEN** the block or redirect resolves before the death record, and the death record resolves before the win check

#### Scenario: A death starts one shared path

- **WHEN** a capability returns a kill intent
- **THEN** `kill` writes the one death record, applies protection and impairment, and adds the one log line

#### Scenario: No second history

- **WHEN** a capability or coordinator records a consequence
- **THEN** it writes through `state.log` or the command journal, and derives events from the state diff

### Requirement: Every command uses one transaction boundary

A command SHALL pass through prepare, validate, draft apply, invariants,
commit, persist and publish, in that order. Prepare SHALL bind the id to a
fingerprint of type, payload and ruleset version. Validate and preview SHALL
run on a clone. A rejected command and a `requires-storyteller-choice` result
SHALL return before commit. A failed save SHALL restore the pre-command state.
A repeated id with the same fingerprint SHALL be idempotent; different content
SHALL return `command-id-conflict`.

**Source**: `docs/adr/0002-engine-contracts.md` §4; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/commands/prepare.test.ts`, `src/core/engine/commands.test.ts`, `src/application/store/create-game-store.test.ts`, `src/core/engine/invariants.test.ts`

#### Scenario: Preview does not commit

- **WHEN** `previewCommand` runs an allowed command
- **THEN** it returns events and consequences, and the canonical state is unchanged

#### Scenario: A rejected command leaves no trace

- **WHEN** validate or apply rejects a command
- **THEN** the live state, journal, log and revision are unchanged

#### Scenario: A save failure rolls back

- **WHEN** the store cannot persist an applied command
- **THEN** it restores the pre-command clone and returns `persist-failed`

#### Scenario: A reused id

- **WHEN** a command reuses an id with the same fingerprint
- **THEN** the result is idempotent; a different fingerprint returns `command-id-conflict`

### Requirement: Lifecycle transitions have explicit guards

The game SHALL use the phase union `setup`, `deal`, `seat`, `night`, `day`,
`over` and SHALL change phase only in the engine function that owns the
transition. Each transition SHALL reject an unmet precondition. A declared win
SHALL move the game to `over`. A same-edition custom script SHALL use the
normal path.

**Source**: `docs/adr/0002-engine-contracts.md` §6; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/engine/setup.test.ts`, `src/core/engine/commands.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Night cannot end early

- **WHEN** the host ends a night with an unfinished step or a pending Demon heir
- **THEN** `endNight` rejects and the phase stays `night`

#### Scenario: Day cannot end with a madness review

- **WHEN** a madness review is due
- **THEN** `endDay` rejects and the phase stays `day`

### Requirement: Manual-only scripts stay manual

A mixed-edition custom script SHALL set `manualOnly`. A manual-only game SHALL
build no automatic night queue, resolve no automatic secret and declare no
automatic winner. The host records effects and the winner.

**Source**: `docs/adr/0002-engine-contracts.md` §6; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/engine/setup.test.ts`, `src/core/engine/commands.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Mixed edition is manual

- **WHEN** a custom script mixes editions without `manualOnly`
- **THEN** the model rejects the script; with `manualOnly` it builds no automatic night queue and declares no automatic winner

### Requirement: Versioning and replay stay compatible

A slice SHALL keep the storage key `pg.game.v4`, `SCHEMA_VERSION = 4`, the
accepted `RULESET_VERSION`, the command payloads and the journal entry fields.
A replay SHALL reproduce the canonical state from the recorded journal. An
export and import SHALL reproduce the same canonical state. A new optional
field SHALL validate on load before a later slice writes it.

**Source**: `docs/adr/0002-engine-contracts.md` §7; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/engine/commands.test.ts`, `src/core/engine/invariants.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Replay reproduces the saved game

- **WHEN** a journal is replayed through the command path
- **THEN** the canonical state equals the saved state, and a non-reproducible entry returns `journal-dependency`

#### Scenario: Export and import round trip

- **WHEN** a v4 game is exported and imported
- **THEN** the canonical state is identical and the storage key is unchanged

#### Scenario: Unknown ruleset version

- **WHEN** a command declares a ruleset version the build does not accept
- **THEN** it is rejected before any state is read
