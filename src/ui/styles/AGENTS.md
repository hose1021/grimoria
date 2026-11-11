# Tailwind and tokens

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Keep the single `@theme` token block aligned with `css/app.css`; the types-policy check enforces the mirror.

Preflight stays disabled while legacy screens remain. Preserve explicit CSS layers and Tailwind source scanning; do not scan tests or locale catalogs.

Unlayered legacy CSS outranks layered utilities. Remove conflicting legacy styling from migrated elements; use the established approach for unavoidable global overrides.

Check: `node scripts/check-types-policy.mjs` and `npm run build`; inspect affected native and legacy screens at desktop and 390 px.
