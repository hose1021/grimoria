# Spec Delta

## ADDED Requirements

### Requirement: The remaining death-step roles use the typed arms

Barber, Sage and Sweetheart SHALL declare both their night and death steps
through `night-step` and `death-step` capabilities with `timing: "other"`.
The step shape, actor predicate, target mode, `optional` and `infoKind` SHALL
stay unchanged, and no resolver SHALL be added.

**Source**: [Barber r1757](https://wiki.bloodontheclocktower.com/index.php?title=Barber&oldid=1757), [Sage r3009](https://wiki.bloodontheclocktower.com/index.php?title=Sage&oldid=3009), [Sweetheart r2704](https://wiki.bloodontheclocktower.com/index.php?title=Sweetheart&oldid=2704); [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/death-step-roles.test.ts`, `src/core/roles/sage/role.test.ts`, `src/core/roles/sweetheart/role.test.ts`

#### Scenario: Both wakes are declared

- **WHEN** the engine asks for the night or death step
- **THEN** the role returns the same step it returned from the legacy field

#### Scenario: Death still gates the wake

- **WHEN** the actor did not die recently as that role, or is alive
- **THEN** the actor returns no wake

#### Scenario: No resolver

- **WHEN** the engine asks for a night resolver
- **THEN** none is declared and the existing engine path runs
