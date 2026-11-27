# Spec Delta

## ADDED Requirements

### Requirement: Abnormal ability marking panel

The table menu SHALL offer the ABNORMAL marking control during a day or night:
a player choice, a reason field, a record control and the current marks. It
SHALL dispatch `recordAbnormal` through the store action and SHALL contain no
game rule.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: Mark from the table

- **WHEN** the host opens the table menu during a day or night
- **THEN** the ABNORMAL panel offers the player list, the reason field and the
  record control, and lists the current marks

#### Scenario: Inactive phases

- **WHEN** the game is over or still in setup
- **THEN** the ABNORMAL panel is not offered
