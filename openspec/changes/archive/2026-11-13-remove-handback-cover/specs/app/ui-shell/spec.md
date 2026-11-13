# Spec Delta

## ADDED Requirements

### Requirement: Setup routes open without a cover

After `/player` or `/public`, `/bag`, `/seat` and `/secrets` SHALL render
directly. The shell SHALL NOT place a cover screen, a warning step or an extra
confirmation between a private route and a setup route. The hide overlay on
`/table` after a private route keeps its own requirement and SHALL stay.

**Source**: `SPEC.md` "Screens" (`/player`); issue #142
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Player handoff to the bag

- **WHEN** the player handoff opens `/bag` after `/player`
- **THEN** the bag renders without a cover heading or a return control

#### Scenario: Browser back from the handoff

- **WHEN** the browser back button returns from `/player` to `/bag`
- **THEN** the bag renders without a cover heading or a return control

#### Scenario: Table overlay unchanged

- **WHEN** `/table` opens after `/player` or `/public`
- **THEN** the hide overlay still covers the console until the host reveals it
