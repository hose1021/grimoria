# Spec Delta

## ADDED Requirements

### Requirement: Seat action dock

The seat screen SHALL render its actions in the bottom bar of the main column,
below the seat ring, not in the left rail. The bar SHALL contain the status line
and exactly one control for each action: Игроку, Отменить, Перемешать,
Использовать порядок. The screen SHALL render no "Секреты" action and no
"Далее: секреты" link; `/secrets` stays reachable from the app bar. At 390 CSS
pixels the bar SHALL wrap without horizontal scrolling and each control SHALL be
at least 44 pixels high.

**Source**: `SPEC.md` "Screens"; issue #154
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Actions under the ring

- **WHEN** `/seat` renders with a dealt bag
- **THEN** the action controls are inside the main column's bottom bar and no
  action control renders in the left rail

#### Scenario: One player control

- **WHEN** `/seat` renders
- **THEN** exactly one control links to `/player`

#### Scenario: No secrets shortcut

- **WHEN** `/seat` renders
- **THEN** no control on the screen links to `/secrets` and the app bar keeps its
  secrets route

#### Scenario: Phone width

- **WHEN** `/seat` renders at 390 CSS pixels
- **THEN** the document does not scroll horizontally and every action control is
  at least 44 pixels high

### Requirement: Exact-order commit

The use action SHALL commit the draft exactly as displayed: the same player ids
in the same positions, each player's seat updated to its new position, and no
re-sort, re-deal or shuffle. A published state after the commit SHALL keep that
order. The commit SHALL keep the current forward navigation.

**Source**: `SPEC.md` "Screens"; issue #154
**Tests**: `scripts/browser-check.mjs`, `src/core/engine/commands.test.ts`

#### Scenario: Swapped order is kept

- **WHEN** the host swaps two seats and activates the use action
- **THEN** the saved order equals the displayed draft and each player's seat
  matches that position

#### Scenario: Published state matches

- **WHEN** the screen reads the game after a successful commit
- **THEN** the ring shows the committed order with no reordering

#### Scenario: Rejected commit

- **WHEN** the command rejects the order
- **THEN** the reason is shown and the draft stays unchanged
