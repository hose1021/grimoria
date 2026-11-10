# app/command-contracts Specification

## Purpose
Defines the typed command surface: what a caller may compose, how one logical
action keeps its identity from preview to apply, which results exist, how a
Storyteller choice is expressed, how a domain outcome differs from a saved one,
and why runtime validation remains the only way to obtain a game state.

## Requirements

### Requirement: Composed input and prepared command

A caller SHALL compose a `CommandInput` carrying `type`, a payload for that type
and optionally `id`, `at` and `rulesetVersion`. A command SHALL become callable
only after `prepareCommand`, which returns a `PreparedCommand` carrying `id`,
`type`, `payload`, `at`, `rulesetVersion` and `fingerprint`. `preview` and
`dispatch` SHALL accept only a `PreparedCommand` and SHALL NOT allocate an id, a
timestamp or a ruleset version.

**Source**: `SPEC.md` "Domain rules"; `AGENTS.md` "Architecture & Data Flow"
**Tests**: `js/commands.test.mjs`, `js/types.test-d.ts`

#### Scenario: One identity per action

- **WHEN** a screen prepares `{ type: "recordVotes", payload: { nominationId, voterIds } }`
- **THEN** the prepared command has an id, a timestamp, the supported ruleset
  version and a fingerprint, and both a later preview and a later dispatch of
  that same object observe the same four values

#### Scenario: Supplied identity is preserved

- **WHEN** the input already carries `id`, `at` or `rulesetVersion`, as a legacy
  screen, a test or an imported action does
- **THEN** `prepareCommand` keeps those values and does not replace them

#### Scenario: Runtime validation of an external command

- **WHEN** a value from JSON or storage enters through `adoptPrepared`
- **THEN** the envelope is validated and the fingerprint recomputed; a mismatch
  is rejected before any state read

#### Scenario: Trust boundary

- **WHEN** an object is forged at runtime and passed to `dispatch`
- **THEN** the envelope is validated, because the type alone is not a security
  control

### Requirement: Replay, retry and a new action

The store SHALL distinguish a retry of one prepared command from a new action
with the same payload. A repeated id with the same fingerprint SHALL be a no-op;
a repeated id with a different fingerprint SHALL be rejected; a second
`prepareCommand` call SHALL produce a new id.

**Source**: `SPEC.md` "State v4" and "Domain rules"
**Tests**: `js/commands.test.mjs`, `js/store.test.mjs`

#### Scenario: Retry

- **WHEN** the same prepared command is dispatched twice
- **THEN** the second result is `allowed` with `idempotent: true` and the state
  does not change again

#### Scenario: Id conflict

- **WHEN** a prepared command reuses an applied id with a different payload or
  ruleset version
- **THEN** it is rejected with `command-id-conflict` and the state is unchanged

#### Scenario: New action

- **WHEN** the host repeats the same logical step from scratch
- **THEN** `prepareCommand` returns a new id and the domain decides whether the
  second action is legal

#### Scenario: State changed between preview and dispatch

- **WHEN** the game changes after a preview and before the dispatch of the same
  prepared command
- **THEN** dispatch re-validates against the current state, may reject, and
  writes nothing when it does

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
- **THEN** runtime validation or the domain handler rejects it and the state is
  unchanged

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

`JSON.parse`, stored values, imported files and network responses SHALL be typed
`unknown` and SHALL pass runtime validation and migration before typed code
reads them. The validated state type SHALL reject ordinary assignment of an
unvalidated value.

**Source**: `SPEC.md` "State v4"; `AGENTS.md` "Code Conventions"
**Tests**: `js/store.test.mjs`, `js/scripts.test.mjs`, `js/types.test-d.ts`

#### Scenario: Corrupt stored value

- **WHEN** the stored game is missing a player table
- **THEN** the load reports the problem, keeps a backup and does not hand a
  typed state to the caller

#### Scenario: Unvalidated assignment

- **WHEN** code assigns a plain game state to the validated state type
- **THEN** the type check fails, because only the validator produces that type

#### Scenario: Assertion is not validation

- **WHEN** code asserts a raw object to the validated state type
- **THEN** the assertion compiles, the runtime validator remains the only check,
  and the policy scan reports the assertion outside the two allowed boundary
  files

### Requirement: Restricted assertions

`as ValidatedState` and `as unknown as` SHALL appear only in the validator and
the external command adapter. The policy scan SHALL report either token
elsewhere in `src/`. The scan is textual; it SHALL document that it narrows the
surface without proving the absence of a bypass.

**Source**: `AGENTS.md` "Code Conventions"; issue #52
**Tests**: `scripts/check-types-policy.test.mjs`, `js/types.test-d.ts`

#### Scenario: Assertion outside the boundary

- **WHEN** a module outside `src/core/model/validated.ts` and
  `src/application/dispatch/adopt.ts` casts to the validated state type
- **THEN** the policy check fails and names the file and the token

#### Scenario: Declaration without a reason

- **WHEN** the policy documentation is read
- **THEN** it states which bypasses a textual scan cannot catch and that review
  is the remaining control

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
