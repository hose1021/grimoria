# Spec Delta

## MODIFIED Requirements

### Requirement: Seat and day controls

A seat token SHALL select or deselect the night target, select the execution
target by day, and otherwise open the correction dialog with the alive toggle,
role change, shown-role change, reminder, effect deactivation, winner rollback
and claim recovery. The day bottom strip SHALL show votes and threshold, the
dead count, role-card, execute and undo; hide SHALL live in the side panel. The
role-card control SHALL open the role card.

**Source**: `SPEC.md` "Screens" (`/table`); issue #42; [Witch r2682](https://wiki.bloodontheclocktower.com/index.php?title=Witch&oldid=2682)
**Tests**: `scripts/browser-check.ts`, `src/core/engine/commands.test.ts`

#### Scenario: Target or correction

- **WHEN** the host activates a seat during a target step, during the day and
  outside a target step
- **THEN** the first selects the night target, the second selects the execution
  target, and the third opens the correction dialog

#### Scenario: Deactivate an effect

- **WHEN** the host chooses Deactivate effect, picks one of the player's active
  effects and applies the correction with a reason
- **THEN** the effect becomes inactive and the journal records the reason

#### Scenario: Change the shown role

- **WHEN** the host chooses Shown role, picks a script role and applies the
  correction with a reason
- **THEN** the player's shown role changes and the journal records the reason

#### Scenario: Day execution strip

- **WHEN** the day console renders with a selected seat
- **THEN** the bottom strip shows the votes and threshold, the dead count, the
  role card and the crimson execute control, keeps undo, and offers no hide
  control

#### Scenario: Clear the day target

- **WHEN** the host activates the selected day seat again
- **THEN** the seat clears, the execute control becomes the neutral "Day without
  execution" control, and that control ends the day without an execution
