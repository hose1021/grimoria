## MODIFIED Requirements

### Requirement: A role module may declare a resolvable ability

The role module contract SHALL allow a role to declare an ability resolver, on
a `night-step` capability and in no other field. The resolver SHALL receive
only read-only facts: the actor, the validated targets, the host's character
answer, the impairment fact and an actual-character lookup; it SHALL NOT
receive the game state. A module that declares no resolver SHALL keep its
existing engine path.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200); `Gambler` r3073; `docs/adr/0002-engine-contracts.md` §2
**Tests**: `src/core/roles/gambler/role.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/roles/night-step.test.ts`

#### Scenario: A migrated role declares its resolution

- **WHEN** the Gambler module is loaded
- **THEN** it declares an ability resolver on its `night-step` capability, and the engine keeps no Gambler resolution branch

#### Scenario: The resolver reads facts, not state

- **WHEN** a resolver builds a decision for a target and a character answer
- **THEN** it uses the actor, the targets, the answer, the impairment fact and the actual character of a seat
- **AND** the contract exposes no game state that the resolver could mutate

#### Scenario: A resolver outside a capability

- **WHEN** a module declares a resolver in a field of its own
- **THEN** the type check rejects the module

### Requirement: A role module declares its night step as a capability

A role module that has moved to the capability contract SHALL declare its
night step as a `night-step` capability: the nights it covers, the step the
queue builds and an optional resolver over the read-only ability facts. Every
reader of a declared night step or resolver SHALL use one lookup in
`src/core/roles`. A module SHALL NOT declare a night step in both forms, and a
module without a `night-step` capability SHALL own no resolver.

**Source**: `docs/adr/0002-engine-contracts.md` §2 and "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/night-step.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: One declaration covers every night

- **WHEN** a module declares one `night-step` capability with timing `any`
- **THEN** the lookup returns that step and resolver on the first night and on every later night

#### Scenario: A role does not act on the first night

- **WHEN** a module declares only a `night-step` capability with timing `other`
- **THEN** the lookup returns no step and no resolver on the first night, and returns them on every later night

#### Scenario: The first night differs

- **WHEN** a module declares a `first` capability beside an `other` or `any` capability
- **THEN** the lookup returns the `first` capability on the first night and the other one on every later night

#### Scenario: A module has not moved

- **WHEN** a module declares no `night-step` capability
- **THEN** the lookup returns its first-night field or else its night field on the first night, its night field on later nights, and no resolver on any night

#### Scenario: One form per module

- **WHEN** the registry is checked
- **THEN** no module declares a `night-step` capability together with `nightStep` or `firstNightStep`, and no module has an `ability` field

#### Scenario: Timing agrees with the printed night order

- **WHEN** a module declares a `night-step` capability
- **THEN** it covers the first night exactly when its role is in the first-night order of its edition, and the other nights exactly when its role is in the other-night order

## ADDED Requirements

### Requirement: The Gambler declares its step from the second night

The Gambler role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first, and SHALL NOT declare
a legacy night step. The step SHALL take one player, alive or dead, the
Gambler included, SHALL list the characters of the script to guess from and
SHALL offer no death to the outcome panel.

**Source**: [Gambler r3073](https://wiki.bloodontheclocktower.com/index.php?title=Gambler&oldid=3073); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/gambler/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with a Gambler in play
- **THEN** the queue holds no Gambler step, and the lookup returns no step and no resolver for that night

#### Scenario: Later nights

- **WHEN** the second and the third night start
- **THEN** the queue holds the Gambler's step with one player to choose, the note of the role, the characters of the script and no death control

#### Scenario: No character is named

- **WHEN** the Gambler's step is completed with a player and no character
- **THEN** the step is completed, nobody dies and the step keeps no result

#### Scenario: A wrong guess

- **WHEN** the Gambler names a character the chosen player does not have
- **THEN** the Gambler dies by the ability, the death is logged before the step line and the step keeps no result

#### Scenario: The ledger

- **WHEN** the ownership ledger is generated
- **THEN** the Gambler's row declares the `night-step` capability alone and keeps the engine reference of its list of characters

### Requirement: The Pukka declares one step for every night

The Pukka role module SHALL declare its step and its resolver on one
`night-step` capability for every night, the first included, and SHALL NOT
declare a legacy night step. The step SHALL take one player, the Pukka
included, and SHALL offer no death to the outcome panel.

**Source**: [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/pukka/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: Every night

- **WHEN** the first, the second and the third night start with a Pukka in play
- **THEN** the queue holds the Pukka's step with the same shape on each of them

#### Scenario: The first choice

- **WHEN** the Pukka's step is completed on the first night
- **THEN** the chosen player is poisoned, the death waits for the second night, nobody dies and the step records the poisoned player

#### Scenario: A drunk Pukka on the first night

- **WHEN** the Pukka is drunk and its step is completed on the first night
- **THEN** nobody is poisoned, no death waits and the step keeps the note of a suspended poison

#### Scenario: A Lunatic who is shown the Pukka

- **WHEN** a living Lunatic was shown the Pukka
- **THEN** the Lunatic's step of a later night takes one player, and the Pukka's step yields a note on every night

#### Scenario: The ledger

- **WHEN** the ownership ledger is generated
- **THEN** the Pukka's row declares the `night-step` capability alone and keeps its engine references

### Requirement: Moving a resolver to the capability changes no outcome

Moving the Gambler's and the Pukka's resolver to the `night-step` capability
SHALL NOT change a night queue, a step record, an effect, a death, a log
line, a command result or the order of draws from the command ports for the
same starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The same commands

- **WHEN** the same Gambler or Pukka step is completed before and after the move
- **THEN** the step, the effects, the deaths, the log lines and the command result are identical

#### Scenario: A journal

- **WHEN** a journal with Gambler and Pukka steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state
