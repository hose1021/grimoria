# React shell

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Use React and the existing `ShellPorts`/hooks; do not import `js/` or concrete infrastructure. Core dependencies here are types, not rule execution.

Persist game edits through command ports. Local selections, overlays and unfinished Storyteller input belong in component state.

Preserve stable router/store snapshots and effect cleanup. Legacy screens mount only through the bridge; do not copy them into a second state owner.

Read [screen guidance](screens/AGENTS.md) or [style guidance](styles/AGENTS.md) when working there.

Check: `npm run typecheck`, `npm test` and `node scripts/browser-check.mjs` for UI behavior changes; smoke the route at desktop and about 390 px.
