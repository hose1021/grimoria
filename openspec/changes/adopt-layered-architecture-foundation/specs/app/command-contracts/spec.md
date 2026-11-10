# Spec Delta

## Purpose

Defines the typed command surface: what a caller may compose, what the engine
receives, which results exist, how a Storyteller choice is expressed, how a
domain outcome differs from a saved one, and why runtime validation remains the
only way to obtain a game state.

## ADDED Requirements

### Requirement: Command input and normalized command

A caller SHALL compose a `CommandInput` carrying `type`, a payload for that
type and an optional `at`. The store SHALL assign `id`, `at` and
`rulesetVersion`. A `Command` with those fields SHALL exist only after runtime
normalization.

**Source**: `SPEC.md` "Domain rules"; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `js/commands.test.mjs`, `js/types.test-d.ts`

#### Scenario: Composed command

- **WHEN** a screen submits `{ type: "recordVotes", payload: { nominationId, voterIds } }`
- **THEN** the store normalizes it with an id, a timestamp and the supported
  ruleset version before validation

#### Scenario: Unknown type at runtime

- **WHEN** a command object arrives from JSON with a type that is not registered
- **THEN** normalization rejects it with `command-unknown` and the state is
  unchanged

#### Scenario: Unsupported ruleset

- **WHEN** a command declares a ruleset version the app does not support
- **THEN** it is rejected before any state read

### Requirement: Payload union per command type

The payload type SHALL be discriminated by the command type. A payload field
that the handler does not read, a missing required field or a field of the
wrong type SHALL be a compile-time error.

**Source**: `SPEC.md` "Domain rules"; `AGENTS.md` "Code Conventions"
**Tests**: `js/types.test-d.ts`, `js/commands.test.mjs`

#### Scenario: Wrong payload field

- **WHEN** code submits `recordVotes` with `votes` instead of `voterIds`
- **THEN** the type check fails

#### Scenario: Payload on a command without one

- **WHEN** code submits `startNight` with an unexpected payload field
- **THEN** the type check fails

#### Scenario: JSON-injected payload

- **WHEN** a well-typed payload is replaced at runtime by a JSON value with an
  extra field
- **THEN** runtime normalization or the domain handler rejects it and the state
  is unchanged

### Requirement: Result union and Storyteller choices

A command result SHALL be exactly one of `allowed`, `rejected` or
`requires-storyteller-choice`. A rejection SHALL carry a reason and a machine
code; a choice SHALL carry a kind from a closed set and its options. Reading a
field of one variant on another SHALL be a compile-time error.

**Source**: `SPEC.md` "Domain rules"; `AGENTS.md` "Code Conventions"
**Tests**: `js/commands.test.mjs`, `js/types.test-d.ts`

#### Scenario: Rejected result

- **WHEN** a command is rejected
- **THEN** the result carries `reason` and `errorCode` and no allowed-only field

#### Scenario: Host decision

- **WHEN** an action needs a Storyteller decision
- **THEN** the result carries one of `info`, `redirect` or `setup` and the legal
  options, and no mutation happened

#### Scenario: Unnarrowed read

- **WHEN** code reads `reason` without narrowing `status`
- **THEN** the type check fails

### Requirement: Domain outcome distinct from persistence

The domain SHALL return an outcome that carries no persistence state, and only
the store SHALL add it. An allowed result reaching a caller SHALL report that
the change is saved; a failed write SHALL be a rejection.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #52
**Tests**: `js/store.test.mjs`, `js/commands.test.mjs`

#### Scenario: Domain result

- **WHEN** the domain applies a command successfully
- **THEN** its result has no `persisted` field

#### Scenario: Failed write

- **WHEN** the store cannot persist an accepted command
- **THEN** the caller receives a rejection with `persist-failed` and no success
  variant

### Requirement: Untrusted input stays validated

`JSON.parse`, stored values, imported files and network responses SHALL be
typed `unknown` and SHALL pass runtime validation and migration before typed
code reads them. A TypeScript assertion SHALL NOT be accepted in place of
runtime validation.

**Source**: `SPEC.md` "State v4"; `AGENTS.md` "Code Conventions"
**Tests**: `js/store.test.mjs`, `js/scripts.test.mjs`

#### Scenario: Corrupt stored value

- **WHEN** the stored game is missing a player table
- **THEN** the load reports the problem, keeps a backup and does not hand a
  typed state to the caller

#### Scenario: Assertion without validation

- **WHEN** code casts an object to the state type without calling the validator
- **THEN** the compile-time test rejects the assignment because the validated
  type cannot be produced by a cast

### Requirement: Suppression and `any` policy

`@ts-ignore` and `@ts-nocheck` SHALL remain forbidden, every
`@ts-expect-error` SHALL carry a reason, `any` SHALL NOT appear in new source
under `src/`, and the `any` count in the legacy tree SHALL NOT grow and SHALL
decrease with each migrated module.

**Source**: `AGENTS.md` "Code Conventions"; issue #52
**Tests**: `scripts/check-types-policy.test.mjs`, `js/types.test-d.ts`

#### Scenario: New `any`

- **WHEN** a new module under `src/` declares an `any`
- **THEN** the policy check fails

#### Scenario: Baseline grows

- **WHEN** a change adds an `any` to a legacy file
- **THEN** the policy check fails against the recorded baseline

#### Scenario: Unexplained suppression

- **WHEN** a file adds `@ts-expect-error` without a reason
- **THEN** the policy check fails
