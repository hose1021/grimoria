# app/static-types Specification

## Purpose
Defines the project-wide static type contract for the JavaScript runtime: a
strict check-only gate, typed domain and store boundaries, and the guarantee
that typing does not alter player-visible behavior or storage.

## Requirements

### Requirement: Strict type-check gate

The project SHALL run a TypeScript check with `allowJs`, `checkJs`, `strict` and
`noEmit` on every pull request, and any type diagnostic SHALL fail the job. The
gate SHALL emit no files and SHALL NOT add a bundler or a runtime dependency.

**Source**: `AGENTS.md` "Development Commands"; issue #46
**Tests**: `src/core/model/types.test-d.ts`

#### Scenario: Type error blocks a pull request

- **WHEN** a pull request changes a checked file so it has a type error
- **THEN** the type-check job fails and the pull request cannot merge

#### Scenario: Clean change emits nothing

- **WHEN** the checked files have no diagnostics
- **THEN** the job passes and the working tree contains no emitted JavaScript

### Requirement: Typed domain contract

The saved game schema v4, script, player, command, command result, event, effect
and store inputs SHALL carry JSDoc types that the type checker validates. A
command result SHALL discriminate `allowed`, `rejected` and
`requires-storyteller-choice` by `status`.

**Source**: `SPEC.md` "State v4" and "Domain rules"; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `src/core/model/types.test-d.ts`, `src/core/engine/commands.test.ts`, `src/entry/store.test.ts`

#### Scenario: Invalid state field

- **WHEN** code reads a player field that the schema does not define
- **THEN** the type check reports an error

#### Scenario: Result narrowing

- **WHEN** code checks `status === "rejected"`
- **THEN** the type checker exposes the rejection reason and excludes
  `allowed`-only fields

#### Scenario: Invalid command payload

- **WHEN** a command is dispatched with a payload that does not match its type
- **THEN** the type check reports an error

### Requirement: Behavior and compatibility preservation

Type annotations SHALL NOT change runtime behavior, the state schema, storage
keys, exported JSON, error messages, GitHub Pages paths or the offline update
protocol. Every stage SHALL keep the runtime suite and browser checks green.

**Source**: `SPEC.md` "Runtime" and "Reliability and live-play additions"; `AGENTS.md` "Testing & QA"
**Tests**: `src/entry/store.test.ts`, `src/core/engine/commands.test.ts`, `scripts/browser-check.mjs`

#### Scenario: Saved game round trip

- **WHEN** a v4 save is loaded and exported after a typing change
- **THEN** the parsed game is identical and the storage key is unchanged

#### Scenario: Offline update

- **WHEN** a type-only change regenerates `sw.js` and a new worker waits
- **THEN** the existing save-and-activate protocol still applies

#### Scenario: Pages deep link

- **WHEN** a typed build is deployed to GitHub Pages and a nested route is
  reloaded
- **THEN** the `404.html` fallback restores the route as before

### Requirement: Incremental coverage and escape policy

The checked file set SHALL grow stage by stage and SHALL NOT shrink.
`@ts-ignore` and `@ts-nocheck` SHALL NOT be used. `@ts-expect-error` SHALL carry
a reason. `any` SHALL be limited to an untyped browser boundary and SHALL carry
a comment.

**Source**: `AGENTS.md` "Code Conventions"; issue #19
**Tests**: `src/core/model/types.test-d.ts`

#### Scenario: Stage adds a module

- **WHEN** a stage adds a module to the checked set before annotating it
- **THEN** the type check fails with that module's diagnostics, and passes after
  the annotations

#### Scenario: Suppression without a reason

- **WHEN** a checked file adds `@ts-ignore` or an unexplained
  `@ts-expect-error`
- **THEN** the policy check fails

#### Scenario: Coverage does not regress

- **WHEN** a later stage changes `tsconfig.json`
- **THEN** every file checked by the previous stage remains checked

### Requirement: Compile-time contract tests

`src/core/model/types.test-d.ts` SHALL assert positive and negative command and state shapes
and SHALL be part of the type-check gate.

**Source**: `AGENTS.md` "Testing & QA"; issue #19
**Tests**: `src/core/model/types.test-d.ts`

#### Scenario: Valid result assignment

- **WHEN** a test assigns an allowed command result to its discriminated type
- **THEN** the type check passes

#### Scenario: Invalid result access

- **WHEN** a test reads a rejection-only field without narrowing the status
- **THEN** an expected type error is asserted

#### Scenario: Removed required field

- **WHEN** a required state field is removed from the contract
- **THEN** the type check reports the affected reads
