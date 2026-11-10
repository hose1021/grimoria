# Spec Delta

## ADDED Requirements

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
