# Spec Delta

## ADDED Requirements

### Requirement: Deterministic poison dependency resolution

The engine SHALL resolve poison activity in chronological creation order. A poison whose source is impaired by an earlier active poison SHALL be inactive, and a later poison SHALL NOT deactivate an earlier one. The result SHALL NOT depend on the order of entries in `state.effects`.

**Source**: Owner decision on PR #24; [Abilities](https://wiki.bloodontheclocktower.com/Abilities)
**Tests**: `js/commands.test.mjs`, `js/engine.test.mjs`

#### Scenario: Sequential mutual poisoning

- **WHEN** a valid state contains a poison from A to B created on night 1 and a poison from B to A created on night 2 while B was already impaired
- **THEN** A's poison is active, B's poison is inactive, and A remains impaired

#### Scenario: Effect array order

- **WHEN** the engine evaluates the same effect set with `state.effects` reversed
- **THEN** the active set and every impaired player are identical

### Requirement: Cyclic effect dependency rejection

A genuinely unresolvable dependency cycle among poison effects SHALL be rejected with the error code `CYCLIC_EFFECT_DEPENDENCY`. Validation, preview and apply SHALL return that code and SHALL leave the state unchanged; the engine SHALL NOT throw an untyped error or overflow the call stack.

**Source**: Owner decision on PR #24; [Abilities](https://wiki.bloodontheclocktower.com/Abilities)
**Tests**: `js/commands.test.mjs`

#### Scenario: Same-night mutual poison

- **WHEN** a state contains poison A→B and poison B→A with the same start and neither can be resolved by chronology
- **THEN** command validation, preview and apply return `CYCLIC_EFFECT_DEPENDENCY` and the state stays byte-identical

#### Scenario: Three-source cycle

- **WHEN** poison effects A→B, B→C and C→A form a dependency cycle that survives chronological filtering
- **THEN** the command is rejected with `CYCLIC_EFFECT_DEPENDENCY` and no effect or player changes

#### Scenario: Cycle detection is order-independent

- **WHEN** the same cyclic effect set is supplied in reverse array order
- **THEN** the same rejection code and the same effect ids are reported
