# Spec Delta

## ADDED Requirements

### Requirement: Storyteller table status legibility

The storyteller table SHALL distinguish player states including poison, drunkenness, protection, death, reminders and used abilities with readable labels and visually distinguishable treatments.

**Source**: `AGENTS.md` storyteller-console UI requirements
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Player has multiple active states

- **WHEN** the storyteller views a player with more than one active status
- **THEN** each status remains separately labelled and visually distinguishable

#### Scenario: Player is dead

- **WHEN** the storyteller views a dead player
- **THEN** the roster clearly indicates death without hiding the player's other state labels
