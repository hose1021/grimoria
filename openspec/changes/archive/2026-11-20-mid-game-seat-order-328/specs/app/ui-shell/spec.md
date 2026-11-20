# Spec Delta

## MODIFIED Requirements

### Requirement: Seat order draft

The seat screen SHALL keep the seat order as a local draft: selecting or dragging
one seat onto another SHALL swap them, shuffle and undo SHALL change only the
draft, and the use action SHALL commit it. A published state SHALL update the
names on the ring without replacing a non-empty draft. The ring, the sidebar and
the drag ghost SHALL show player names and seat numbers only. Outside `setup`,
`deal` and `seat` the screen SHALL render a locked state instead of the ring.

**Source**: `SPEC.md` "Screens" and `/seat` "names only"; issue #82; issue #171
SET8; issue #328
**Tests**: `scripts/browser-check.ts`, `src/ui/screens/seat-projection.test.ts`,
`src/core/engine/lifecycle.test.ts`

#### Scenario: Publish while editing

- **WHEN** the store publishes a renamed player while a draft is open
- **THEN** the ring shows the new name and keeps the draft order

#### Scenario: Empty draft

- **WHEN** the store publishes an order while the screen shows the empty state
- **THEN** the ring renders that order

#### Scenario: Swap

- **WHEN** two seats are activated in turn
- **THEN** their occupants swap, the status line names the result and undo
  restores the previous order

#### Scenario: Names only

- **WHEN** the seat route renders a dealt game
- **THEN** every seat shows a name and a seat number and no role name, role
  artwork, team or alive state

#### Scenario: Locked after the game starts

- **WHEN** `/seat` renders while the phase is `night`, `day` or `over`
- **THEN** the locked state replaces the ring, offers no commit control, and the
  engine rejects a `setOrder` command
