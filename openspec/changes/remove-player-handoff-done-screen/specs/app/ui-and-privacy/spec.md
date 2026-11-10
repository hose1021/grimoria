# Spec Delta

## ADDED Requirements

### Requirement: Player handoff completion

After a player saves a valid name, the player handoff SHALL hide the shown-role
card and return to the number picker, without an intermediate pass-the-device
step. When every number is claimed, the number picker SHALL offer the seat
arrangement route.

**Source**: `SPEC.md` `/player`
**Tests**: `scripts/browser-check.mjs:781`

#### Scenario: Save returns to the number picker

- **WHEN** a player reveals their role, enters a non-empty name and saves
- **THEN** the role card is hidden and the number picker is visible again

#### Scenario: Last claim offers seats

- **WHEN** the last open number is claimed and saved
- **THEN** the number picker shows the route to seat arrangement
