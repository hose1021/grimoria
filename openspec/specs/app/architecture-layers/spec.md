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
composition root imports all four.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #52
**Tests**: `scripts/check-types-policy.test.mjs`, `js/types.test-d.ts`

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

### Requirement: Browser globals confined to the outer layers

`src/core` and `src/application` SHALL NOT reference `window`, `document`,
`localStorage`, `sessionStorage`, `navigator`, `Date.now` or a `node:*` module.
They SHALL compile under a TypeScript configuration without DOM or Node
libraries.

**Source**: `SPEC.md` "Runtime"; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `js/types.test-d.ts`, `scripts/check-types-policy.test.mjs`

#### Scenario: DOM type in core

- **WHEN** a `src/core` module reads `document`
- **THEN** the core type-check fails because the DOM library is absent

#### Scenario: Browser global by name

- **WHEN** a `src/application` module references `localStorage` without a DOM
  library
- **THEN** the architecture check reports it before the run reaches the browser

### Requirement: Production and test source sets

The project SHALL define a production set and a disjoint test set. Production
configurations SHALL exclude `*.test.ts`, `*.test-d.ts` and test fixtures and
SHALL keep `types: []`; the test configuration SHALL include those files with
Node types. Test files SHALL NOT be reachable from production code.

**Source**: `AGENTS.md` "Development Commands"; issue #52
**Tests**: `scripts/check-types-policy.test.mjs`, `js/types.test-d.ts`

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

### Requirement: Automated boundary check

A repository check SHALL parse every static import and export form in `src` and
`js`, classify the specifier, and reject a forbidden edge. It SHALL be exercised
by negative fixtures that prove each rule can fail, and it SHALL document which
bypasses a textual scan cannot detect.

**Source**: `AGENTS.md` "Development Commands"; issue #52
**Tests**: `scripts/check-types-policy.test.mjs`

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
**Tests**: `scripts/browser-check.mjs`, `js/store.test.mjs`

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
**Tests**: `js/store.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: Language switch

- **WHEN** the host changes the language
- **THEN** the preference is written once through the adapter and survives a
  reload

#### Scenario: Game key untouched

- **WHEN** a preference changes on any screen
- **THEN** the saved game value is byte-identical
