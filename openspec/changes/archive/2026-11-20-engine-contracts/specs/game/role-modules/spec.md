# Spec Delta

## ADDED Requirements

### Requirement: A role capability names its step kind

The role module contract SHALL express each contribution as a discriminated
capability for one step kind: night step, day action, death trigger, execution,
information, adjudication, transformation or win. A capability SHALL receive
only the read-only facts of its kind and return a typed decision. It SHALL NOT
be one optional interface carrying every hook. A role SHALL use its legacy
field or its capability for one behavior, never both.

**Source**: `docs/adr/0002-engine-contracts.md` §2; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/roles/ability.test-d.ts`, `src/core/roles/gambler/role.test.ts`, `src/core/roles/pukka/role.test.ts`, `src/core/roles/architecture.test.ts`

#### Scenario: A night step declares its capability

- **WHEN** a role owns a night step
- **THEN** its capability names the night step and its first/other timing, and its resolver reads only the night context

#### Scenario: A context exposes no game state

- **WHEN** a capability resolver reads its context
- **THEN** the context offers the actor, targets, impairment fact and named lookups, and exposes no mutable game state

#### Scenario: A role does not use both paths

- **WHEN** a role migration moves one behavior into a capability
- **THEN** the same slice deletes the legacy field for that behavior

### Requirement: Role modules do not import the engine

A module under `src/core/roles` SHALL NOT import a module under
`src/core/engine`, except for the exact imports recorded in ADR 0002:
`src/core/roles/imp/role.ts` importing `engine/becoming.ts` and
`engine/effects.ts`, and `src/core/roles/sv-common.ts` importing
`engine/context.ts` and `engine/retention.ts`. `src/core/roles/registry.ts`
SHALL import only `src/core/roles` and `src/core/model`. The exception list
SHALL shrink with each removal slice and SHALL NOT grow.

**Source**: `docs/adr/0002-engine-contracts.md` §1; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/roles/architecture.test.ts`, `src/core/roles/registry.test.ts`

#### Scenario: A new role imports the engine

- **WHEN** a role module imports any engine module outside the documented entries
- **THEN** `node --test src/core/roles/architecture.test.ts` fails and names the file and the specifier

#### Scenario: A documented exception adds an import

- **WHEN** `src/core/roles/imp/role.ts` imports a third engine module
- **THEN** the architecture test fails, because the exception is an exact list

#### Scenario: The registry leaves its layer

- **WHEN** `src/core/roles/registry.ts` imports an application, infrastructure, UI or entry module
- **THEN** the architecture test fails

### Requirement: A new capability arm arrives with its role

A capability arm SHALL be added only with the first role that needs it. A slice
that adds an arm SHALL record a characterization result before and after the
move. The slice SHALL NOT change a queue, command status, state field, journal
entry, note or winner reason for the same starting state.

**Source**: `docs/adr/0002-engine-contracts.md` §2 and "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/commands.test.ts`

#### Scenario: An arm without a consumer

- **WHEN** a change adds a capability arm that no migrated role uses
- **THEN** review rejects it as unused scaffolding

#### Scenario: A migrated role keeps its outcome

- **WHEN** a role moves into a capability
- **THEN** the characterization test passes before and after, with the same canonical state and journal
