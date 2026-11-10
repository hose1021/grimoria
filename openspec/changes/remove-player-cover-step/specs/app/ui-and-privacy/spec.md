# Spec Delta

## ADDED Requirements

### Requirement: Role reveal on the number tap

Tapping a free number on the player handoff SHALL render the shown-role card
immediately and start the auto-hide deadline on that tap. A claimed number and
a number without a dealt role SHALL stay inert.

**Source**: `SPEC.md` `/player`
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Free number shows the role

- **WHEN** a player taps a free number
- **THEN** the shown-role card appears without an intermediate reveal screen

#### Scenario: Claimed number stays inert

- **WHEN** a player taps a claimed number
- **THEN** no role card appears

#### Scenario: Auto-hide returns to the picker

- **WHEN** the role card is open and Escape is pressed or the document becomes hidden
- **THEN** the number picker returns and the role card is gone
