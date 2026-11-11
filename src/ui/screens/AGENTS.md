# Native screens

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Reuse shared components, ports and catalog data. Keep role mechanics and validation in core; show rejected and Storyteller-choice outcomes instead of silently choosing defaults.

Private handoff displays `shownRoleId`; public views use public projections. The sheet is read-only and must not alter the saved game.

Use translation keys for new UI copy in all three UI locales. Preserve accessible labels, keyboard operation, dialog focus and cleanup of timers/listeners on navigation.

For regressions, add a focused behavioral check to the existing browser suite. Check: `node scripts/browser-check.mjs`; inspect the changed route, console and 390 px layout.
