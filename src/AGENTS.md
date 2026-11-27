# Typed application

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Keep dependencies directed inward; see [architecture](../docs/adr/0005-runtime-boundaries.md) for the layer contract. The composition root wires concrete adapters; domain and application modules receive ports.

Use the existing TypeScript import extension convention in the touched module; do not rewrite imports as part of unrelated work.

Do not add browser globals to core/application or Node runtime imports to production code. Keep tests in the test TypeScript program.

Check: `npm run typecheck` and `node scripts/check-types-policy.ts` from the repository root.

## Code conventions

Only what linters and the type checker do not enforce:

- ES modules with explicit `.js` extensions in relative imports.
- Tailwind utilities for styling; React 19, ReactDOM, Radix Dialog/Label are the only runtime dependencies.
- Domain actions are verb-first (`startNight`, `completeStep`, `recordVotes`,
  `executeByDecision`, `manualCorrection`). Screens dispatch commands with a unique id.
- Keep mutations idempotent where the engine already guards them (completed
  steps, recorded votes, dead targets, existing winners, repeated night starts).
- DOM screens (`help.ts`, `demo.ts`): delegated `data-*` events with `closest()`,
  listeners on `root`, cleanup through `AbortController`, escape with `esc()`
  from `src/ui/dom.ts`. Each screen exports `mount(root)` returning cleanup, and `unmount()`.
- UI strings go to `src/ui/i18n/locales/{ru,en,az}.ts` via `t(key, vars)`.
  Azerbaijani coverage is incomplete; do not assume it. Keep changes understandable in all three where practical.
- Role names and abilities come from `src/infrastructure/catalog/role-catalog.ts`
  / `window.PG.roles`, never hardcoded. `TB` is the supported non-Traveller
  set; use `allRoles()` for the sheet and Travellers.
- Export/import contains secret roles and notes. Keep the warning.
- Offline: cache URLs stay relative, never auto-activate a new worker during an
  active game (activation follows an explicit **Update** and a successful save),
  keep `.nojekyll` and relative asset paths (the app may live under a Pages subpath).
