# Design

## Context

The table route renders the host console using `js/table.js` and `css/host.css`. The screen already contains a phase header, a main action card, player roster, queue/log/notes and mobile panel tabs. This change restyles those existing regions and adds semantic status classes to the existing effect badges.

## Goals / Non-Goals

**Goals:**

- Make the active phase and current task the strongest visual elements.
- Keep the roster and host tools visually separate from the live action.
- Use state-specific colors and labels for poison, drunk, protection, death, reminders and used abilities.
- Preserve the current responsive controls, role cards, privacy overlays and localization.

**Non-Goals:**

- Changing rule evaluation, commands, game state, player views, navigation or copy.
- Introducing a framework, dependency, new artwork or new screen.

## Decisions

### Scope the refresh to the storyteller route

Use the existing table screen markup and append route-specific rules to `css/host.css`. Other screens share this stylesheet and must retain their current visual language.

### Give status badges semantic kinds

Keep the existing localized labels, but render typed status chips so the stylesheet can distinguish poison, drunkenness, protection, reminders, and spent abilities. Unknown reminder labels remain neutral.

### Keep existing responsive navigation

Preserve the roster/play/tools tab behavior on small screens and the fixed bottom navigation. Restyle them to match the refreshed console.

## Risks / Trade-offs

- A stronger color system can make dense status rows more vivid. Use restrained hues, maintain readable text contrast, and let labels carry the meaning.

## Migration Plan

No data or schema migration. Rollback consists of reverting the table stylesheet and badge markup change.
