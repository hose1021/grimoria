# Command Engine Specification

## Purpose

Defines the single mutation path for the saved game: command validation, preview,
atomic apply, the idempotency ledger and the invariants that every accepted
state must keep.

## Requirements

### Requirement: Validate, preview and apply contract

Every persisting action SHALL be a command that validates against the current
state and returns one of `allowed`, `rejected` with a reason, or
`requires-storyteller-choice` with legal options; a rejected command SHALL leave
the state unchanged.

**Source**: `SPEC.md` "State v4" and "Domain rules"
**Tests**: `js/commands.test.mjs:53`, `js/commands.test.mjs:62`, `js/commands.test.mjs:98`

#### Scenario: Unknown command

- **WHEN** a screen dispatches a command type that is not registered
- **THEN** validation returns `rejected` and the state is byte-identical

#### Scenario: Host decision required

- **WHEN** a lethal attack on a sober Mayor is applied
- **THEN** the result is `requires-storyteller-choice` with the legal redirect options

### Requirement: Atomic apply

Apply SHALL run on a draft copy and SHALL commit the whole draft or none of it,
including recorded corrections.

**Source**: `SPEC.md` "Domain rules"
**Tests**: `js/commands.test.mjs:98`

#### Scenario: Rejected correction

- **WHEN** a correction fails validation during apply
- **THEN** the correction list and every other field stay unchanged

### Requirement: Idempotency ledger

Apply SHALL record a command id bound to a canonical fingerprint of type,
payload and ruleset version; a repeated id with the same fingerprint SHALL be a
no-op, a repeated id with a different payload SHALL be rejected, and an
unsupported ruleset version SHALL be rejected before any mutation.

**Source**: `SPEC.md` "State v4"
**Tests**: `js/commands.test.mjs:121`, `js/commands.test.mjs:314`, `js/commands.test.mjs:336`

#### Scenario: Repeated identical command

- **WHEN** the same command id, type and payload are applied twice
- **THEN** the second apply reports success without a second state change

#### Scenario: Unsupported ruleset version

- **WHEN** a command declares a ruleset version the app does not support
- **THEN** the command is rejected and the state is byte-identical

### Requirement: Deterministic preview and apply

Preview SHALL report the domain diff and delayed effects without mutating, and
SHALL agree with apply for the same initial state; the command timestamp is
captured once per id, fingerprint and initial state, and random values come
from a seeded generator.

**Source**: `SPEC.md` "Domain rules"
**Tests**: `js/commands.test.mjs:80`, `js/commands.test.mjs:360`, `js/commands.test.mjs:384`

#### Scenario: Preview then apply

- **WHEN** a command is previewed and then applied from the same initial state
- **THEN** both report the same domain events

### Requirement: State invariants

Every accepted state SHALL keep one role and team per player, no reference to a
missing player, an idempotent completion record, and no winner declared before
all mandatory immediate effects are resolved.

**Source**: `SPEC.md` "Domain rules"; `AGENTS.md` "Code Conventions"
**Tests**: `js/commands.test.mjs:148`

#### Scenario: Dangling player reference

- **WHEN** a draft effect or death points at a player id that does not exist
- **THEN** `checkInvariants` reports an error and apply rejects the command

#### Scenario: Premature winner

- **WHEN** a draft declares a winner while a mandatory Demon inheritance is unresolved
- **THEN** `checkInvariants` reports an error
