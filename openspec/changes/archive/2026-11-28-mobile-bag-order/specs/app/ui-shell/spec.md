# Spec Delta

## ADDED Requirements

### Requirement: Mobile bag composition order

Below 900 CSS pixels `/bag` SHALL render the player-count header, then the
scenario picker, then the composition summary, then the preset, manual and random
pickers. At 900 CSS pixels and above the two-column layout SHALL keep the
scenario and composition rail in the left column.

**Source**: `SPEC.md` "CSS and accessibility"; issue #467
**Tests**: `scripts/browser-check.ts`

#### Scenario: Phone order

- **WHEN** `/bag` renders at 390 CSS pixels
- **THEN** the scenario card starts below the count header, the composition card
  starts below the scenario card, and the picker tabs start below the composition
  card

#### Scenario: No horizontal overflow

- **WHEN** `/bag` renders at 390 CSS pixels
- **THEN** the document does not scroll horizontally

#### Scenario: Desktop order

- **WHEN** `/bag` renders at 1280 CSS pixels
- **THEN** the scenario and composition rail renders in the left column and the
  pickers stay in the right column
