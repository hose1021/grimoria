## ADDED Requirements

### Requirement: A permanent effect waits for no effect on its source

The effect graph SHALL NOT make a permanent poison or drunk effect wait for the
effects that impair its source, because it holds whatever its source is.
Effects whose source is its target SHALL still wait for it. A cycle that only
such a wait closed SHALL resolve, and the permanent effect SHALL hold in
either visiting order.

**Source**: [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977) "How to Run": "The Goon still changes alignment, and makes the player drunk, if the player choosing the Goon was already drunk or poisoned."; Owner decision on PR #24 (SYS-EFFECTS-04); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/commands.test.ts`

#### Scenario: A permanent drunk on a source that poisons itself

- **WHEN** a player's poison on themself started on night 2 and a permanent drunk on that player starts on night 3 and expires on night 4, in either array order
- **THEN** on night 3 the graph resolves, the drunk is active, the poison is suspended and the player is impaired, and on night 4 the drunk is inactive and the poison is active again

#### Scenario: Either visiting order

- **WHEN** another player's poison on the source sorts before or after the permanent drunk
- **THEN** both effects are active and the source is impaired

#### Scenario: Two effects that depend on their source

- **WHEN** a player's poison and drunk on themself start the same night and neither is permanent
- **THEN** validation returns `CYCLIC_EFFECT_DEPENDENCY`, and the same pair with a permanent drunk resolves with the drunk active and the poison suspended

### Requirement: The Vigormortis poison still waits for its dead Minion

The effect graph SHALL keep a Vigormortis poison waiting for the effects on its
dead Minion, because the poison ends while that Minion is drunk or poisoned. A
same-night cycle through that Minion SHALL still be rejected with
`CYCLIC_EFFECT_DEPENDENCY`.

**Source**: [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015) (SNV-VIGORMORTIS-02); Owner decision on PR #24 (SYS-EFFECTS-04); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/commands.test.ts`

#### Scenario: A cycle through the dead Minion

- **WHEN** a Vigormortis poison from a dead Minion to its neighbour and that neighbour's poison on the Minion start the same night, in either array order
- **THEN** the graph and command validation return `CYCLIC_EFFECT_DEPENDENCY` naming both effects

#### Scenario: Another permanent poison

- **WHEN** the same pair holds a permanent poison that is not a Vigormortis poison
- **THEN** the graph resolves with the permanent poison active and the neighbour's poison suspended
