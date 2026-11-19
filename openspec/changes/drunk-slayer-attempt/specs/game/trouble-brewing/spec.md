## ADDED Requirements

### Requirement: Apparent Slayer shot

A living Drunk shown the Slayer SHALL be able to record one apparent Slayer shot during the day. The attempt SHALL spend only that player's apparent shot and SHALL cause no death.

**Source**: [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), [Slayer r3122](https://wiki.bloodontheclocktower.com/index.php?title=Slayer&oldid=3122)
**Tests**: `src/core/engine/tb-audit.test.ts`

#### Scenario: Drunk chooses the Demon

- **WHEN** the Drunk shown the Slayer chooses the living Demon
- **THEN** the attempt is accepted and recorded, the Demon survives, and a repeat attempt is rejected
