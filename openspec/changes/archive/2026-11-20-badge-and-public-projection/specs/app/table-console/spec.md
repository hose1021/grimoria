# Spec Delta

## MODIFIED Requirements

### Requirement: Text state badges

Each seat SHALL show its states as coloured text badges under the role artwork:
acting, nominated, dead, ghost vote available or used, drunk, poisoned and
protected. A drunk and poisoned player SHALL show both states. The state SHALL
NOT be conveyed by colour alone; the acting, nominated and dead seats SHALL also
differ by outline, mark or label. The table SHALL show only states that are
true, and the role-specific host tokens (red herring, butler's master, spent
ability) SHALL remain in the player card.

**Source**: [Issue #164](https://github.com/hose1021/grimoria/issues/164), [Issue #331](https://github.com/hose1021/grimoria/issues/331); `design/prototypes/05-velvet-ring.html`
**Tests**: `scripts/browser-check.ts`, `src/application/read-models/table.test.ts`, `src/ui/screens/table/helpers.test.ts`

#### Scenario: Acting seat

- **WHEN** a night step has an actor
- **THEN** the actor's seat shows the acting text badge and the amber outline

#### Scenario: Nominated seat

- **WHEN** a nomination is open
- **THEN** the nominee's seat shows the nomination text badge and the danger
  outline

#### Scenario: Dead and ghost vote

- **WHEN** a player dies
- **THEN** the seat shows the dead text badge and whether the ghost vote is
  still available

#### Scenario: Poison and protection

- **WHEN** a player is poisoned or protected
- **THEN** the seat shows the matching text badge and the state remains readable
  without colour

#### Scenario: Drunk and poisoned

- **WHEN** a player is drunk and also poisoned
- **THEN** the seat shows the drunk badge and the poison badge, and neither true
  state hides the other
