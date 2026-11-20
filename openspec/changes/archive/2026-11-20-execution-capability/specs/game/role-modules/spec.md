## ADDED Requirements

### Requirement: A role module declares its execution contribution

A role that changes the outcome of an execution SHALL declare an `execution`
capability. The engine SHALL pass read-only facts and SHALL keep the command
validation, the host's survival choice, the death path and the journal. A
`survives` decision SHALL mean the option is legal; it SHALL NOT override the
host's choice.

**Source**: [Pacifist r2601](https://wiki.bloodontheclocktower.com/index.php?title=Pacifist&oldid=2601)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A good player with a sober Pacifist

- **WHEN** a good player is executed and a living, unimpaired Pacifist is in play
- **THEN** the Pacifist capability returns `survives` and the host's survival flag is accepted

#### Scenario: No living Pacifist

- **WHEN** the execution has no living, unimpaired Pacifist
- **THEN** the capability returns no effect and the survival flag is rejected with `error.57`

#### Scenario: An evil target

- **WHEN** an evil player is executed
- **THEN** the capability returns no effect and the survival flag is rejected

#### Scenario: The host declines survival

- **WHEN** the survival option is legal but the host does not use it
- **THEN** the normal execution death path runs unchanged
