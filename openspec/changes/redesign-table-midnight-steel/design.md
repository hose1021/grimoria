# Design

## Context

The table route renders through `js/table.js` and `css/host.css`. The previous table revision retained a player rail, current-step column and utility rail. Player selection opened the correction dialog immediately, so inspection and correction were coupled. Night information was computed inline, but the reveal action did not say who should see it.

## Goals / Non-Goals

**Goals:**

- Put the current task and its completion controls first.
- Give each player an explicit selection affordance and a storyteller-only detail card.
- Keep secret role data separate from player-facing reveal flows.
- Make poison, drunkenness, protection, death, reminders and used abilities distinguishable.
- Separate player inspection from manual correction.
- Preserve responsive play/roster/tools navigation and all existing game actions.

**Non-Goals:**

- Changing game rules, command payloads, persistent state, turn order, navigation routes or public/player projections.
- Replacing the single-device host aid with multiplayer or a backend.
- Adding runtime dependencies or a UI framework.

## Decisions

### Use an action-first workbench

The desktop grid places the active game card in the main work area, host tools in a side column and the player roster across the lower workbench. On narrow screens, the existing tabs continue to isolate play, roster and tools. This puts the live decision above the reference material while preserving access to the full table.

### Separate inspect and edit controls

Selecting a seat updates `selectedSeat` and renders a storyteller-only player card. The card shows the actual role, ability, alive/dead state and active status chips. A separate correction control opens the existing correction dialog. Keep the `data-seat-open` correction action for compatibility with existing workflows; add `data-seat-select` for inspection.

### Make private reveal explicit

Keep `infoText` as the engine-derived result. Label its panel as information for the player and the action as showing the information card to the player. The Spy still gets the existing Grimoire action. The host-only player card never becomes a reveal action.

### Retain semantic status labels

Render the same localized state text with `data-status` values so poison, drunk, protection, reminders and spent abilities have separate visual treatments. Do not infer new rules or alter engine state.

## Risks / Trade-offs

- Moving the roster below the active step adds vertical scroll on smaller desktop viewports. The player count is bounded by a typical in-person game and the roster can use a compact card grid.
- The storyteller card contains secret roles. It is available only on the host table route; player and public projections remain untouched.
- A new selection affordance must stay distinct from the correction action. Use separate buttons and accessible names.

## Migration Plan

No state or schema migration. Reverting the table module, stylesheet and locale additions restores the previous screen.
