# Composition root

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Wire concrete adapters, the store facade, the remaining DOM screens (`screens/help.ts`, `screens/demo.ts`) and `ShellPorts` here. Keep UI independent of concrete storage implementations.

The DOM screens return a mount cleanup function, use delegated `data-*` events with an `AbortController`, and escape interpolated content with `esc()` from `src/ui/dom.ts`. Dispatch persisted edits; never mutate live state or call `store.run` from a screen. Keep the demo state independent of the real save.

Preserve locale initialization, storage status and offline preparation order. Do not put game rules in boot code.

Check: `npm run typecheck`, `npm run build` and `node scripts/check-types-policy.mjs`; smoke startup and reload after boot changes.
