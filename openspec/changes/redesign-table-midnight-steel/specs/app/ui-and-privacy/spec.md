# Spec Delta

## ADDED Requirements

### Requirement: Player selection opens a storyteller card

Selecting a player on the storyteller table SHALL show that player's role, ability, alive/dead state and active status labels in a storyteller-only detail card. Selection SHALL NOT change game state or open the manual correction dialog. Correction remains a separate explicit action.

**Source**: `AGENTS.md` storyteller console and screen interaction rules
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Inspect a player

- **WHEN** the storyteller selects a seat
- **THEN** the host sees the player's role, ability and current states without applying a correction

#### Scenario: Correct a player's state

- **WHEN** the storyteller chooses the explicit correction action
- **THEN** the existing correction dialog opens for that player

### Requirement: Private information reveal identifies its recipient

A computed night result SHALL be labelled as information for the player, and its reveal action SHALL identify that the card is shown to the player. The storyteller-only player card SHALL NOT be used as the player reveal.

**Source**: `AGENTS.md` privacy and player projection rules
**Tests**: `scripts/browser-check.mjs`

#### Scenario: Show computed information

- **WHEN** an information role has a ready result
- **THEN** the storyteller can distinguish the player-facing information card from host-only role details
