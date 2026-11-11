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

### Requirement: Deterministic impairment dependency resolution

The engine SHALL resolve poison and drunk effects by their target-to-source dependency graph. An effect SHALL be inactive while its source is impaired by another active effect; a self-target SHALL remain active unless another effect impairs the source. Creation order SHALL decide which effect was validly created, and the result SHALL NOT depend on the order of `state.effects`.

**Source**: Owner decision on PR #24; [Abilities](https://wiki.bloodontheclocktower.com/Abilities)
**Tests**: `js/commands.test.mjs`, `js/engine.test.mjs`

#### Scenario: Sequential mutual poisoning

- **WHEN** a valid state contains a poison from A to B created on night 1 and a poison from B to A created on night 2 while B was already impaired
- **THEN** A's poison is active, B's poison is inactive, and A remains impaired

#### Scenario: Later poison suspends an earlier Pukka poison

- **WHEN** the Pukka poisons A on night 1 and another poison targets the Pukka on night 2
- **THEN** A's poison and pending death are suspended while the Pukka is impaired, and both resume when the Pukka becomes healthy

#### Scenario: Effect array order

- **WHEN** the engine evaluates the same effect set with `state.effects` reversed
- **THEN** the active set and every impaired player are identical

### Requirement: Effect lifetime boundaries

An effect SHALL be inactive before its `start` and at or after its `expires`. A not-yet-started effect SHALL NOT impair a target or a source; an expired effect SHALL NOT impair or suspend another effect. The boundary SHALL be the cycle of the phase and number.

**Source**: Owner decision on PR #24; [Abilities](https://wiki.bloodontheclocktower.com/Abilities)
**Tests**: `js/commands.test.mjs`

#### Scenario: Future poison does not impair

- **WHEN** a poison effect starts on night 2 and the engine evaluates the game on night 1
- **THEN** the target is not impaired and the poison is inactive

#### Scenario: Expired drunk does not impair

- **WHEN** a drunk effect expires on night 3 and the engine evaluates the game on night 3
- **THEN** the target is not impaired and the effect is inactive

#### Scenario: Start and expiry boundaries

- **WHEN** the engine evaluates an effect at its start cycle and at its expiry cycle
- **THEN** the effect is active at the start cycle and inactive at the expiry cycle

### Requirement: Impaired effect sources

A poison or drunk effect whose living source is impaired by another active effect SHALL be inactive. A drunk effect from a dead source SHALL remain active for an on-death ability; a self-target effect SHALL remain active unless another effect impairs the source.

**Source**: Owner decision on PR #24; [Abilities](https://wiki.bloodontheclocktower.com/Abilities)
**Tests**: `js/commands.test.mjs`, `js/bmr.test.mjs`

#### Scenario: Poisoned Sailor's drunk effect

- **WHEN** the Sailor's drunk effect is active and the Sailor becomes poisoned
- **THEN** the target is no longer drunk, and becomes drunk again when the poison ends

#### Scenario: Dead Sweetheart's drunk effect

- **WHEN** the Sweetheart creates a drunk effect on death
- **THEN** the effect remains active while its dead source is not otherwise impaired

#### Scenario: Self-target drunk effect

- **WHEN** the Sailor chooses itself
- **THEN** the drunk effect is active and the Sailor is impaired

### Requirement: Simultaneous poison and drunk

When a player is targeted by both poison and drunk effects, the player SHALL be impaired once, and both effects SHALL coexist in the dependency graph. A source impaired by either effect SHALL lose its own poison and drunk effects.

**Source**: Owner decision on PR #24; [Abilities](https://wiki.bloodontheclocktower.com/Abilities)
**Tests**: `js/commands.test.mjs`, `js/bmr.test.mjs`

#### Scenario: Both effects on one target

- **WHEN** a poison effect and a drunk effect target the same player
- **THEN** `isImpaired` is true and both effects are active

#### Scenario: Source both poisoned and drunk

- **WHEN** a source is targeted by both a poison and a drunk effect
- **THEN** its own poison and drunk effects are inactive, and removing only one impairment keeps them inactive while the other remains

#### Scenario: Mixed same-night cycle

- **WHEN** poison A→B and drunk B→A share the same start and cannot be resolved by creation order
- **THEN** validation, preview and apply return `CYCLIC_EFFECT_DEPENDENCY` and the state stays byte-identical

### Requirement: Cyclic effect dependency rejection

A genuinely unresolvable dependency cycle among poison or drunk effects SHALL be rejected with the error code `CYCLIC_EFFECT_DEPENDENCY`. Validation, preview, apply and import SHALL return that code and SHALL leave the state unchanged; the engine SHALL NOT throw an untyped error or overflow the call stack.

**Source**: Owner decision on PR #24; [Abilities](https://wiki.bloodontheclocktower.com/Abilities)
**Tests**: `js/commands.test.mjs`, `js/store.test.mjs`

#### Scenario: Same-night mutual poison

- **WHEN** a state contains poison A→B and poison B→A with the same start and neither can be resolved by chronology
- **THEN** command validation, preview and apply return `CYCLIC_EFFECT_DEPENDENCY` and the state stays byte-identical

#### Scenario: Three-source cycle

- **WHEN** poison effects A→B, B→C and C→A form a dependency cycle that survives creation filtering
- **THEN** the command is rejected with `CYCLIC_EFFECT_DEPENDENCY` and no effect or player changes

#### Scenario: Cycle detection is order-independent

- **WHEN** the same cyclic effect set is supplied in reverse array order
- **THEN** the same rejection code and the same effect ids are reported

### Requirement: Shared event priority

The engine SHALL expose one frozen event priority list, shared by Trouble
Brewing, Bad Moon Rising and Sects & Violets, that ranks deaths before their
on-death wakes, deferred steps, conditional wakes, impairment resolution and the
win check, in that order.

**Source**: Issue #29; `openspec/specs/game/command-engine/spec.md` "Deterministic impairment dependency resolution"
**Tests**: `js/commands.test.mjs`

#### Scenario: One ordered list

- **WHEN** the engine loads
- **THEN** `EVENT_PRIORITY` is frozen, lists the six event classes and its values increase with the documented order

### Requirement: Cascade resolution

The engine SHALL resolve a cascade in one call: every declared `after` edge is
honoured, ties follow the shared event priority and then the key, and the
result SHALL NOT depend on the insertion order of the items.

**Source**: Issue #29; `openspec/specs/game/command-engine/spec.md` "Deterministic impairment dependency resolution"
**Tests**: `js/commands.test.mjs`

#### Scenario: A to B to C in one call

- **WHEN** a cascade declares B after A and C after B and the items are passed in any order
- **THEN** one call returns A, B, C

#### Scenario: Insertion order does not change the result

- **WHEN** the same events are supplied forward and reversed
- **THEN** both calls return the same ordered keys

### Requirement: Cyclic cascade rejection

An unresolvable cascade cycle SHALL return the typed `CYCLIC_CASCADE` error
with the sorted unresolvable keys, SHALL NOT throw or recurse, and SHALL NOT
change the caller's input or the saved state.

**Source**: Issue #29; `openspec/specs/game/command-engine/spec.md` "Cyclic effect dependency rejection"
**Tests**: `js/commands.test.mjs`

#### Scenario: Cyclic cascade

- **WHEN** the items form A after B, B after C and C after A
- **THEN** the resolver returns `CYCLIC_CASCADE` with `A`, `B`, `C` regardless of insertion order and the input is byte-identical

#### Scenario: Effect cycle in a command

- **WHEN** a saved state contains a same-night poison cycle
- **THEN** validation, preview and apply reject the command and leave the state unchanged

### Requirement: Death-triggered wake order

Death-triggered and conditional night steps SHALL be inserted by their official
`nightsheet.json` order rather than appended in code or death order, so the set
of deaths resolves to the same night queue in any recording order.

**Source**: [Official night sheet](https://release.botc.app/resources/data/nightsheet.json), local snapshot `docs/official/nightsheet.json`; Issue #29
**Tests**: `js/snv.test.mjs`, `js/bmr.test.mjs`

#### Scenario: Two deaths in one night

- **WHEN** the Sweetheart and the Barber both die in one night
- **THEN** the Barber's earlier official slot precedes the Sweetheart's wake, in either order the deaths are recorded

#### Scenario: BMR Grandmother death step

- **WHEN** the Po kills the grandchild in the same night
- **THEN** the conditional Grandmother step takes the BMR sequence slot before the Chambermaid, not an appended position

#### Scenario: Effect chain in one graph resolution

- **WHEN** an effect chain A→B→C is evaluated once
- **THEN** B is impaired, C is not, and A's poison is active while B's poison is inactive
