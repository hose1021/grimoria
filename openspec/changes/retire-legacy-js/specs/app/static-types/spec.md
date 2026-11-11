# Spec Delta

## MODIFIED Requirements

### Requirement: Strict type-check gate

The project SHALL run a TypeScript check with `strict` and `noEmit` on every
pull request, and any type diagnostic SHALL fail the job. The gate SHALL emit
no files and SHALL NOT add a bundler or a runtime dependency. The legacy
`allowJs`/`checkJs` program SHALL be removed together with the JavaScript tree
it checked.

**Source**: `AGENTS.md` "Development Commands"; issue #46, issue #132
**Tests**: `src/core/model/types.test-d.ts`, `scripts/check-types-policy.test.mjs`

#### Scenario: Type error blocks a pull request

- **WHEN** a pull request changes a checked file so it has a type error
- **THEN** the type-check job fails and the pull request cannot merge

#### Scenario: Clean change emits nothing

- **WHEN** the checked files have no diagnostics
- **THEN** the job passes and the working tree contains no emitted JavaScript

#### Scenario: Legacy program retired

- **WHEN** the typecheck scripts and the TypeScript configurations are read
- **THEN** no program includes `js/**` or enables `checkJs`, because the
  directory no longer exists


### Requirement: Typed domain contract

The saved game schema v4, script, player, command, command result, event, effect
and store inputs SHALL carry TypeScript types that the type checker validates. A
command result SHALL discriminate `allowed`, `rejected` and
`requires-storyteller-choice` by `status`.

**Source**: `SPEC.md` "State v4" and "Domain rules"; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `src/core/model/types.test-d.ts`,
`src/core/engine/commands.test.ts`, `src/entry/store.test.ts`

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


### Requirement: Incremental coverage and escape policy

The checked file set SHALL cover every module under `src/`. `@ts-ignore` and
`@ts-nocheck` SHALL NOT be used. `@ts-expect-error` SHALL carry a reason. `any`
SHALL be limited to an untyped browser boundary and SHALL carry a comment.

**Source**: `AGENTS.md` "Code Conventions"; issue #19, issue #132
**Tests**: `src/core/model/types.test-d.ts`,
`scripts/check-types-policy.test.mjs`

#### Scenario: Stage adds a module

- **WHEN** a new module enters `src/` before it is annotated
- **THEN** the type check fails with that module's diagnostics, and passes
  after the annotations

#### Scenario: Suppression without a reason

- **WHEN** a checked file adds `@ts-ignore` or an unexplained
  `@ts-expect-error`
- **THEN** the policy check fails

#### Scenario: Coverage does not regress

- **WHEN** a later stage changes a TypeScript configuration
- **THEN** every file checked by the previous stage remains checked

#### Scenario: Legacy coverage retires with its files

- **WHEN** the last JavaScript module leaves the repository
- **THEN** the coverage requirement applies to `src/` only, and removing the
  deleted files is not counted as a coverage regression


### Requirement: Compile-time contract tests

`src/core/model/types.test-d.ts` SHALL assert positive and negative command and
state shapes and SHALL be part of the type-check gate.

**Source**: `AGENTS.md` "Testing & QA"; issue #19, issue #132
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
