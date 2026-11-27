# Spec Delta

## ADDED Requirements

### Requirement: A role module returns intents, never shared mechanics

A role module SHALL express its rule as a typed decision over read-only facts.
It SHALL NOT call a shared resolution writer, mutate a game record, or keep a
second implementation of protection, death, execution, transformation, effect
resolution or win for the engine to call. A role-specific predicate that only
reads facts is allowed.

**Source**: `docs/adr/0002-engine-contracts.md` §1 and §2; [Issue #212](https://github.com/hose1021/grimoria/issues/212)
**Tests**: `src/core/roles/architecture.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/engine/coordinator.test.ts`

#### Scenario: The engine applies a returned intent

- **WHEN** a capability resolver decides that a player dies
- **THEN** it returns a `kill` intent and the engine records the death through the shared death path

#### Scenario: A role calls a shared writer

- **WHEN** a role module calls a shared writer or imports the engine to reach one
- **THEN** the architecture test and the ownership check fail

#### Scenario: A role keeps its own fact predicate

- **WHEN** a role reads deaths, effects or seat order to answer its own rule question
- **THEN** the read is allowed, because it neither writes state nor replaces a shared mechanic
