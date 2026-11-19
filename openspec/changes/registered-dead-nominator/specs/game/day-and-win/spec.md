# Spec Delta

## ADDED Requirements

### Requirement: The nomination picker offers only registered-living players

The table's nomination form SHALL list only players who are alive and do not
register as dead, because a registered-dead player cannot nominate.

**Source**: [Zombuul r3022](https://wiki.bloodontheclocktower.com/index.php?title=Zombuul&oldid=3022) "Summary"; Issue #313
**Tests**: `src/application/read-models/table.test.ts`

#### Scenario: A registered-dead Zombuul is in play

- **WHEN** the Zombuul is alive but registered dead and the Virgin nomination form opens
- **THEN** the picker does not offer the Zombuul as a nominator
- **AND** the other living players remain offered
