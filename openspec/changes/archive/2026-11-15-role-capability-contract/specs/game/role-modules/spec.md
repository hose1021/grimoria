# Spec Delta

## ADDED Requirements

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
