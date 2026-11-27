# Spec Delta

## ADDED Requirements

### Requirement: The Clockmaker distance ends at a Minion in play

The Clockmaker distance SHALL use every Minion in play, alive or dead. Only the
Demon must be alive.

**Source**: [Clockmaker r2967](https://wiki.bloodontheclocktower.com/index.php?title=Clockmaker&oldid=2967) "Summary"; [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168) "In play"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The nearest Minion is dead

- **WHEN** a dead Minion is the nearest Minion to the living Demon
- **THEN** the Clockmaker learns the distance to that Minion, not to a living
  Minion farther away
