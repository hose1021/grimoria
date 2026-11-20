# Spec Delta

## ADDED Requirements

### Requirement: The Evil Twin pair is one good and one evil player

When a character change creates the Evil Twin and a living player of the
opposite alignment exists, the pair SHALL contain one good and one evil player
regardless of which alignment the changed player has. The stored ids SHALL name
the good side and the evil side, so the good twin's execution wins for evil.

**Source**: [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101) "Summary"; Issue #219
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A good player becomes the Evil Twin

- **WHEN** the Pit-Hag turns a good player into the Evil Twin
- **THEN** an evil player becomes their twin, the changed player stays good and
  executing them wins for evil

#### Scenario: An evil player becomes the Evil Twin

- **WHEN** the Pit-Hag turns an evil non-Demon into the Evil Twin
- **THEN** a good player becomes their twin and executing that good player wins
  for evil
