# Proposal

Issue: #71

## Why

The storyteller table is the live control surface for a full game. The old layout spread controls across three equal-weight columns and made a player click behave like an immediate correction. It also showed computed information without enough context about who should receive it. During a live game, the host needs to move from a night instruction to a player, inspect that player's secret state, and deliberately reveal the correct information without accidentally changing the game.

## What Changes

- Replace the three-column console with a focused workbench: current game action first, storyteller tools beside it, and a full-width player table below.
- Make selecting a player open a storyteller-only card with role ability, alive/dead state and distinct active statuses. Keep manual correction as a separate explicit action.
- Label computed night information as information for the player and name the reveal action accordingly.
- Preserve the host's existing game commands, privacy overlays, localized strings and mobile play/roster/tools navigation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-and-privacy`: the storyteller workbench separates player inspection, state correction and private information reveal.

## Impact

- Runtime: `css/host.css`, `js/table.js`, `js/table-dialogs.js`, `js/locales/{ru,en,az}.js`.
- No engine, game state, storage schema, public view or route changes.
