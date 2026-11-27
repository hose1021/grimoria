## ADDED Requirements

### Requirement: A Pukka poisoned by its own poison can choose a sober Goon

The engine SHALL accept a Pukka's choice of a sober, healthy Goon while the
Pukka is poisoned by its own poison. The Pukka SHALL be drunk until dusk, the
Goon SHALL take the Pukka's alignment, nobody SHALL die of the choice, and the
Pukka's own poison SHALL be suspended while it is drunk and resume at dusk.

**Source**: [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977) "How to Run": "The Goon still changes alignment, and makes the player drunk, if the player choosing the Goon was already drunk or poisoned."; [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074) "How to Run": "But when the Pukka sobers up, the poison resumes"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`, `scripts/browser-check.ts`

#### Scenario: The choice

- **WHEN** the Pukka poisoned the Chambermaid on night 1 and itself on night 2, and on night 3 chooses the sober, healthy Goon
- **THEN** preview and apply allow the command, the Goon turns evil, the Pukka is drunk until night 4, the Goon is not poisoned, nobody dies, and the journal replays to the same game

#### Scenario: Dusk

- **WHEN** the engine evaluates that game at night 4
- **THEN** the Goon's drunk has expired, the Pukka's poison on itself is active again and the Pukka is still impaired

#### Scenario: The table at 390 px

- **WHEN** the host opens the Pukka's step of night 3 at 390 px and chooses the Goon
- **THEN** the preview names no rejection, the step completes, the Goon is evil, the night moves to the Professor's step and the page has no horizontal overflow
