# Legacy styles

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Use existing `app.css` tokens before adding values. Shared token changes also need the mirror in `src/ui/styles/tokens.css`.

These unlayered styles coexist with layered Tailwind utilities. Scope changes to the remaining legacy screen; new native-screen styling follows `src/ui/styles/AGENTS.md`.

Preserve visible focus, touch targets, contrast and reduced-motion behavior where present.

Check: `npm run build` and `node scripts/check-types-policy.mjs`; inspect both native and legacy consumers at desktop and 390 px.
