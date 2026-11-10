# Spec Delta

## Purpose

Defines the four-layer split of the single static application: what each layer
owns, which imports are legal, where implementations are constructed, and the
automated check that fails when a boundary is crossed. It also fixes the
coexistence rule that keeps one game state while two interfaces exist.

## ADDED Requirements

### Requirement: Layer ownership and allowed imports

The application SHALL be split into `src/core`, `src/application`,
`src/infrastructure` and `src/ui`, and the import direction SHALL be:
`core` imports only `core` and `src/data`; `application` imports `core` and
itself; `infrastructure` imports `application` and `core`;
`ui` imports `application` and `core` read-model types; the composition root
imports all four.

**Source**: `AGENTS.md` "Architecture & Data Flow"; issue #52
**Tests**: `scripts/check-types-policy.test.mjs`, `js/types.test-d.ts`

#### Scenario: Core stays pure

- **WHEN** a `src/core` module imports an `application`, `infrastructure` or
  `ui` module
- **THEN** the architecture check fails and names the file and the specifier

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
`localStorage`, `sessionStorage`, `navigator` or a `node:*` module. They SHALL
compile under a TypeScript configuration without DOM libraries.

**Source**: `SPEC.md` "Runtime"; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `js/types.test-d.ts`, `scripts/check-types-policy.test.mjs`

#### Scenario: DOM type in core

- **WHEN** a `src/core` module reads `document`
- **THEN** the core type-check fails because the DOM library is absent

#### Scenario: Browser global by name

- **WHEN** a `src/application` module references `localStorage` without a DOM
  library
- **THEN** the architecture check reports it before the run reaches the browser

### Requirement: Automated boundary check

A repository check SHALL parse the imports of `src` and `js`, reject a
forbidden edge, and be exercised by negative fixtures that prove every rule can
fail. The check SHALL run in the pull-request pipeline.

**Source**: `AGENTS.md` "Development Commands"; issue #52
**Tests**: `scripts/check-types-policy.test.mjs`

#### Scenario: Fixture per rule

- **WHEN** the check runs against a fixture with a forbidden edge
- **THEN** it exits non-zero and the test asserts the message

#### Scenario: Clean tree

- **WHEN** no module crosses a boundary
- **THEN** the check exits zero and the pipeline continues

### Requirement: Single game state during coexistence

While legacy screens and migrated routes coexist, both SHALL read and mutate
one store instance, and exactly one owner SHALL render a route at a time.

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
