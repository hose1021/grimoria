# Spec Delta

## ADDED Requirements

### Requirement: The Chambermaid wakes only with legal choices

The Chambermaid step SHALL NOT be built unless two other players register as
alive, so the offered choice can never be rejected as a dead target.

**Source**: [Chambermaid r2966](https://wiki.bloodontheclocktower.com/index.php?title=Chambermaid&oldid=2966) "How to Run"; Issue #218
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: Only one registered-living choice

- **WHEN** the other actual living players are all registered dead
- **THEN** the Chambermaid does not wake

### Requirement: The Minstrel drunks every other player

When a Minion dies by execution, the Minstrel SHALL make every other player
drunk, excluding only the Minstrel. The executed Minion and already-dead players
are included.

**Source**: [Minstrel r2600](https://wiki.bloodontheclocktower.com/index.php?title=Minstrel&oldid=2600) "Summary"; Issue #218
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The executed Minion is drunk

- **WHEN** the Minstrel is in play and a Minion is executed
- **THEN** every other player, including the executed Minion, has a drunk effect

### Requirement: A resurrected Moonchild chooses again

Resurrection SHALL clear the Moonchild's stored target, choice alignment and
resolved flag, so the next death allows a new public choice.

**Source**: [Moonchild r1783](https://wiki.bloodontheclocktower.com/index.php?title=Moonchild&oldid=1783) "Examples"; Issue #218
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The Moonchild dies a second time

- **WHEN** a regurgitated Moonchild dies again
- **THEN** `moonchildChoice` accepts a new target
