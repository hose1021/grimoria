# Proposal

Issue: #71

## Why

The storyteller table is the main live-game workspace, but the current compact panels and uniform status chips make it hard to identify the active action and quickly read a player's condition.

## What Changes

- Rework the table screen into a Midnight Steel console with a clearer phase header, active play area, roster rail and host-tools panel.
- Visually distinguish poison, drunkenness, protection, death, reminders and spent abilities.
- Retain existing commands, text, privacy overlays, and small-screen panel navigation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-and-privacy`: improve the visual hierarchy and status legibility of the storyteller table without changing game behavior.

## Impact

- Runtime: `css/host.css`, `js/table.js`.
- No state, engine, route, locale, storage or public-view changes.
