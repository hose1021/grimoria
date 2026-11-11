# Proposal

Issue: #90

## Why

Grimoria supports a Storyteller through setup and a live game, but the current screens use a generic dark palette with different surface treatments. The visual system should feel coherent, calm and legible during a tabletop session.

## What Changes

- Establish a restrained midnight blue and cyan theme across the shell, setup, table, role sheet, player handoff, public view and supporting screens.
- Refine shared panels, controls, status chips, spacing, typography and focus treatment while preserving existing navigation and behavior.
- Add a moonlit village backdrop, three scenario illustrations and a compact set of architectural silhouettes.
- Keep the interface readable over artwork, usable with keyboard and touch, and localized in Russian, English and Azerbaijani.

## Out of Scope

- Game rules, saved state, routes, privacy boundaries and Storyteller workflows.
- New dependencies or replacement of the current React and legacy screen architecture.

## Capabilities

### Modified Capabilities

- `app/ui-and-privacy`: define the shared visual language while retaining route, accessibility and privacy requirements.

## Impact

- Styles: `css/*.css`, `src/ui/styles/*.css`, shared tokens.
- Assets: `public/assets/` atmospheric and scenario artwork.
- No engine, persistence or locale behavior changes.
