# Spec Delta

## Purpose

Defines the per-role ownership contract for the game engine: one module for each
supported character, a registry the type checker keeps complete, and the two
behavior points a module owns. Game outcomes stay identical.

## ADDED Requirements

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
