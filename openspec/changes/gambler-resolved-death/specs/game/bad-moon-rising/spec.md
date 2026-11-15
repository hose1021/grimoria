# Spec Delta

## ADDED Requirements

### Requirement: The engine owns the Gambler's death

The Gambler step SHALL NOT offer a Storyteller control for a recorded death.
The engine SHALL resolve the actor's death on a wrong guess, and the outcome
path SHALL reject any recorded death on that step.

**Source**: [Gambler r3073](https://wiki.bloodontheclocktower.com/index.php?title=Gambler&oldid=3073); Issue #218
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: A correct guess cannot kill the guessed player

- **WHEN** the Gambler guesses correctly and the Storyteller records the
  guessed player as dead through the outcome path
- **THEN** the outcome is rejected and the player stays alive

#### Scenario: A wrong guess still kills the Gambler

- **WHEN** the Gambler guesses wrong
- **THEN** the engine kills the actor exactly once through the shared path
