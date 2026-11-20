# Spec Delta

## ADDED Requirements

### Requirement: The grandchild is a good character and the Grandmother dies with them

The first-night Grandmother step SHALL accept only a target whose real team is
Townsfolk or Outsider. When the Demon kills the stored grandchild, the engine
SHALL kill the Grandmother through the shared death path; protection and
impairment apply.

**Source**: [Grandmother r2978](https://wiki.bloodontheclocktower.com/index.php?title=Grandmother&oldid=2978) "Summary", "How to Run"; Issue #218
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: An evil target is rejected

- **WHEN** the Grandmother first-night step is completed with the Demon
- **THEN** the completion is rejected with `error.grandchild` and no grandchild is stored

#### Scenario: A good target is stored

- **WHEN** the step is completed with a good Townsfolk or Outsider
- **THEN** that seat is stored as the grandchild

#### Scenario: The Demon kills the grandchild

- **WHEN** the Demon's outcome records the grandchild's death
- **THEN** the Grandmother dies through the shared death path and a note step is
  appended

#### Scenario: A drunk Grandmother has no ability

- **WHEN** the Grandmother is drunk or poisoned when the grandchild dies
- **THEN** the Grandmother stays alive
