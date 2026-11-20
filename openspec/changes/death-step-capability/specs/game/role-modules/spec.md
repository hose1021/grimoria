# Spec Delta

## ADDED Requirements

### Requirement: A role can declare its death step as a capability

A role module SHALL be able to declare its death step through a `death-step`
capability with the same `NightStepSpec` as the legacy field. The engine SHALL
read both forms through one accessor, preferring the capability arm. The Klutz
SHALL use the capability for its unchanged one-player post-death choice.

**Source**: [Klutz r1758](https://wiki.bloodontheclocktower.com/index.php?title=Klutz&oldid=1758); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/klutz/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: Death step declaration

- **WHEN** the Klutz dies and a death step is built
- **THEN** the step is the same one-player note choice and the actor refuses a living candidate

#### Scenario: Legacy fallback

- **WHEN** a role still declares only the legacy `deathStep`
- **THEN** `deathStepOf` returns that step and the queue is unchanged

#### Scenario: No night wake

- **WHEN** a night queue asks for the Klutz night step
- **THEN** no step is built
