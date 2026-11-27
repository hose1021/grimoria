## ADDED Requirements

### Requirement: Lunatic player card uses the effective bluff selection

The first-night private Lunatic card SHALL display the Demon bluff list when
no separate Lunatic bluffs are chosen, and SHALL display the separate list
when it is nonempty. It SHALL preserve the existing concealment of the real
Demon's identity and the host's selected false Minions.

**Source**: [Lunatic r3112](https://wiki.bloodontheclocktower.com/index.php?title=Lunatic&oldid=3112), [Issue #256](https://github.com/hose1021/grimoria/issues/256)
**Tests**: `scripts/browser-check.ts`

#### Scenario: Empty default reaches the player

- **WHEN** the host shows the Lunatic's first-night card without selecting separate bluffs
- **THEN** the card shows all three real Demon bluffs and does not identify the real Demon

#### Scenario: Explicit override reaches the player

- **WHEN** a separate nonempty list is selected
- **THEN** the card displays that list instead of the Demon list
