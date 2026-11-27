# Spec Delta

## ADDED Requirements

### Requirement: Snake Charmer dead-seat target picker

On a Snake Charmer night step the Storyteller target picker SHALL disable every
dead player's seat, SHALL keep living seats selectable, and the engine SHALL
continue to reject a dead target with `error.55`.

**Source**: [Issue #104](https://github.com/hose1021/grimoria/issues/104), [Snake Charmer r2905](https://wiki.bloodontheclocktower.com/index.php?title=Snake_Charmer&oldid=2905)
**Tests**: `scripts/browser-check.mjs`, `js/snv.test.mjs`

#### Scenario: Dead seat

- **WHEN** the Snake Charmer step is shown with a dead player in a seat
- **THEN** that seat is disabled and cannot be chosen

#### Scenario: Living seat

- **WHEN** the Snake Charmer step is shown with living players in other seats
- **THEN** those seats remain selectable

#### Scenario: Engine rejection

- **WHEN** a dead target reaches the engine for the Snake Charmer step
- **THEN** the command is rejected with `error.55` and no swap happens
