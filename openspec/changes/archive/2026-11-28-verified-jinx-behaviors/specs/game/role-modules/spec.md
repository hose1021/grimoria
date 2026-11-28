# Spec Delta

## ADDED Requirements

### Requirement: Night-step declarations are capabilities

Every migrated role SHALL declare its night step through one or more
`night-step` capabilities, SHALL keep the same target mode, bounds, info kind,
optional and lethal flags and actor predicate, and SHALL NOT keep a legacy
`nightStep` or `firstNightStep` field. A role that wakes on both nights SHALL
declare `any` or both timings.

**Source**: [Issue #211](https://github.com/hose1021/grimoria/issues/211); `docs/adr/0004-verified-jinx-behaviors.md`
**Tests**: `src/core/roles/night-step.test.ts`, `src/core/roles/courtier/role.test.ts`, `src/core/roles/godfather/role.test.ts`, `src/core/roles/ravenkeeper/role.test.ts`, `src/core/roles/undertaker/role.test.ts`

#### Scenario: One declaration

- **WHEN** a migrated module is loaded
- **THEN** it has a `night-step` arm and no legacy night-step field

#### Scenario: Printed order

- **WHEN** a role is printed on only one night
- **THEN** its arm uses that timing; a death-triggered wake may use `any`

#### Scenario: Behavior preserved

- **WHEN** the queue is built for a migrated role
- **THEN** the same actor, target mode, bounds, info kind and extra fields are
  used as before

### Requirement: Jinx-triggered facts use existing ledgers

A jinx-triggered fact SHALL use the existing queue, ABNORMAL ledger, death
record or step answer. No second event history, effect graph or state store
SHALL be added. The ABNORMAL writes SHALL be deterministic from completed steps
so replay reproduces them.

**Source**: [Issue #475](https://github.com/hose1021/grimoria/issues/475); `docs/adr/0004-verified-jinx-behaviors.md`
**Tests**: `src/core/engine/jinxes.test.ts`

#### Scenario: Replay

- **WHEN** a mixed game with a Drunk or Lunatic jinx is replayed
- **THEN** the ABNORMAL ledger and the Mathematician answer are identical

#### Scenario: No second ledger

- **WHEN** a jinx writes a fact
- **THEN** the existing state record holds it and the existing journal records
  the command that caused it
