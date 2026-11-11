# State and validation

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Treat imports and saved data as unknown until validated. Use `validatedFromUnknown` and the existing validated-state helpers; do not spread branding assertions into callers.

Preserve schema v4 compatibility, migration behavior, stable IDs and `state.order`. A schema change needs an explicit compatibility design and migration regression.

Public projections must exclude secret roles and notes; a shown role may differ from the real role.

Check: `node --test src/core/model/*.test.ts js/scripts.test.mjs js/store.test.mjs` and `npm run typecheck`.
