# Role Modules Specification

## Purpose

Defines the per-role ownership contract for the game engine: one module for each
supported character, a registry the type checker keeps complete, and the two
behavior points a module owns. Game outcomes stay identical.

## Requirements

### Requirement: One module per supported role

The engine SHALL keep exactly one role module for each of the 72 supported
characters. The module set SHALL be checked against the supported role list at
compile time.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177)
**Tests**: `src/core/roles/registry.test.ts`

#### Scenario: A supported role has no module

- **WHEN** a supported role is removed from the module registry
- **THEN** `npm run typecheck` reports the missing registry property and fails

#### Scenario: A module names an unsupported role

- **WHEN** a module declares an identifier outside the supported role list
- **THEN** `npm run typecheck` rejects the registry entry

#### Scenario: The registry is complete

- **WHEN** the test suite loads the registry
- **THEN** it has one entry per supported role, and each entry carries its identifier and edition

### Requirement: A role module declares its night step

Each role module SHALL own the night step its role contributes: the target
mode, target bounds, optional and lethal flags, and any night-dependent
presence rule. The night queue SHALL be built from those declarations.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A waking role contributes its step

- **WHEN** the night queue is built and a role's player is in play and may wake
- **THEN** the step carries the target mode and bounds declared by that role's module

#### Scenario: A role does not wake

- **WHEN** the role is passive, absent, or dead and not death-triggered
- **THEN** the role adds no step to the queue

### Requirement: A role module declares its death behavior

Role-specific death handling SHALL run from the dead role's module. The hook
SHALL keep the existing state effects, result codes and journal entries.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A role with a death hook dies

- **WHEN** a role that declares a death hook dies
- **THEN** the hook applies its recorded effect and the shared death bookkeeping still runs

#### Scenario: A role without a death hook dies

- **WHEN** a role that declares no death hook dies
- **THEN** only the shared death bookkeeping runs

### Requirement: Game outcomes are unchanged

The refactor SHALL NOT change any night queue, command status, state field,
winner reason or error code for the same starting state.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177) "behaviour-preserving refactor"
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/commands.test.ts`

#### Scenario: The same game produces the same queue

- **WHEN** a seeded game for each supported scenario builds its night queue
- **THEN** the queue equals the one the previous implementation built

#### Scenario: The same command produces the same result

- **WHEN** a command is validated and applied before and after the refactor
- **THEN** the status, state and journal entries are identical

### Requirement: A role module may declare a resolvable ability

The role module contract SHALL allow a role to declare an ability resolver. The
resolver SHALL receive only read-only facts: the actor, the validated targets,
the host's character answer, the impairment fact and an actual-character lookup;
it SHALL NOT receive the game state. A module that declares no resolver SHALL
keep its existing engine path.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200); `Gambler` r3073
**Tests**: `src/core/roles/gambler/role.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A migrated role declares its resolution

- **WHEN** the Gambler module is loaded
- **THEN** it declares an ability resolver, and the engine keeps no Gambler resolution branch

#### Scenario: The resolver reads facts, not state

- **WHEN** a resolver builds a decision for a target and a character answer
- **THEN** it uses the actor, the targets, the answer, the impairment fact and the actual character of a seat
- **AND** the contract exposes no game state that the resolver could mutate

### Requirement: The engine applies ability intents through shared mechanics

The engine SHALL apply every effect an ability returns through the existing
shared mechanic, in the returned order, and SHALL record the same death entry,
note and journal output the previous implementation produced. A `suppressed`
decision SHALL write the shared impairment note and change nothing else. A
resolver SHALL NOT write state, set a winner or add its own journal line.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200); `Gambler` r3073
**Tests**: `src/core/engine/bmr.test.ts`, `src/core/roles/gambler/role.test.ts`

#### Scenario: A wrong guess kills the Gambler

- **WHEN** the Gambler guesses a character the chosen player does not have
- **THEN** the actor dies through the shared death path, and the death entry records cause `ability`, ability `gambler` and the Bad Moon Rising marker

#### Scenario: A correct guess has no effect

- **WHEN** the Gambler guesses the character the chosen player actually has
- **THEN** the ability returns no effect and the actor stays alive

#### Scenario: A dead player is a legal target

- **WHEN** the Gambler chooses a player who is already dead
- **THEN** the step completes and the guess is compared with that player's actual character

#### Scenario: Impairment suppresses the ability

- **WHEN** the Gambler is drunk or poisoned when the step completes
- **THEN** the engine writes the shared `note.abilityFailed` note and no death occurs

#### Scenario: Existing outcomes do not change

- **WHEN** the same Gambler game is completed before and after the migration
- **THEN** the queue, status, state, notes and journal entries are identical

### Requirement: Pukka delayed poison capability

The Pukka role module SHALL resolve its night step through the capability
contract. It SHALL receive the night number and the pending deaths it owns, and
SHALL return the poison, delayed death, suspension, poison release and previous
death resolution as typed intents. The engine SHALL apply those intents through
the shared effect helpers in the order returned, with no Pukka branch in the
edition file.

**Source**: [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); [Issue #200](https://github.com/hose1021/grimoria/issues/200); [ADR 0001](../adr/0001-role-capability-contract.md)
**Tests**: `src/core/roles/pukka/role.test.ts`, `src/core/engine/bmr.test.ts`

#### Scenario: New poison before the previous death

- **WHEN** a healthy Pukka chooses a new target and owns a pending death
- **THEN** the resolver returns the new poison, the new delayed death and the
  resolution of the old pending, in that order, and the engine applies them

#### Scenario: Self-target suspension

- **WHEN** the Pukka chooses itself
- **THEN** the resolver treats the new poison as first, suspends the previous
  death until the source is healthy, and releases the source's other poisons

#### Scenario: Impaired Pukka

- **WHEN** the Pukka is drunk or poisoned
- **THEN** the resolver returns the `suppressed` decision, suspends only the due
  pending deaths, writes `note.pukkaSuspended` and no new poison or kill

#### Scenario: Effect identity

- **WHEN** the resolver output is applied
- **THEN** the poison and pending-death ids, fields, step result and command
  outcome are the same as before the migration

### Requirement: Delayed-effect intents and suppressed note

The capability contract SHALL expose `poison`, `delay-death`, `suspend-death`,
`release-poisons` and `resolve-death` intents, SHALL let an `effects` decision
carry a rule note and a step result, and SHALL let `suppressed` carry
suspension intents, a rule note and a result.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200), [ADR 0001](../adr/0001-role-capability-contract.md)
**Tests**: `src/core/roles/pukka/role.test.ts`, `src/core/roles/gambler/role.test.ts`, `src/core/engine/bmr.test.ts`

#### Scenario: Built-in note

- **WHEN** a resolver returns a decision without a note
- **THEN** the engine writes its generic failure note for `suppressed`

#### Scenario: Rule note and result

- **WHEN** a resolver returns a note and a result
- **THEN** the engine writes the rule note and stores the result, adding the
  actual death when a `resolve-death` intent kills
