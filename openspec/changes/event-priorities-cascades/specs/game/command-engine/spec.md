# Spec Delta

## ADDED Requirements

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
**Tests**: `js/snv.test.mjs`

#### Scenario: Two deaths in one night

- **WHEN** the Sweetheart and the Barber both die in one night
- **THEN** the Barber's earlier official slot precedes the Sweetheart's wake, in either order the deaths are recorded

#### Scenario: Effect chain in one graph resolution

- **WHEN** an effect chain A→B→C is evaluated once
- **THEN** B is impaired, C is not, and A's poison is active while B's poison is inactive
