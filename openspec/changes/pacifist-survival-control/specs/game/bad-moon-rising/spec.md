# Spec Delta

## MODIFIED Requirements

### Requirement: Pacifist survival

The execution `survives` flag SHALL be accepted only for a good target while a
living, unimpaired Pacifist is in play and the execution is the day decision;
any other use SHALL be rejected with `error.57` before the day mutates. The
console SHALL render the survival control only when the engine would accept it
for the current target, and SHALL clear a recorded survival flag when the
target, the day or an execution changes.

**Source**: [Pacifist r2601](https://wiki.bloodontheclocktower.com/index.php?title=Pacifist&oldid=2601)
**Tests**: `src/core/engine/engine.test.ts`, `src/application/read-models/table.test.ts`, `scripts/browser-check.ts`

#### Scenario: Evil target

- **WHEN** an evil player is executed with `survives`
- **THEN** the command is rejected with `error.57` and nobody dies

#### Scenario: No Pacifist in play

- **WHEN** a good role is executed with `survives` and no Pacifist is in play
- **THEN** the command is rejected, the player stays alive and no ability is
  spent

#### Scenario: Impaired Pacifist

- **WHEN** the only Pacifist is drunk or poisoned
- **THEN** the flag is rejected

#### Scenario: Control follows the engine

- **WHEN** the console shows the executed player picker
- **THEN** the survival control appears for a good target with a living,
  unimpaired Pacifist in play and for no other target, and a target change clears
  a previous survival choice
