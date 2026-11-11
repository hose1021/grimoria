# Legacy compatibility and tests

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Keep shims as re-exports and the store as a facade; new domain logic belongs in `src/core`, transactions in `src/application`, and browser adapters in `src/infrastructure`.

For remaining DOM screens, return mount cleanup, use delegated `data-*` events with AbortController and escape interpolated content with `esc()`. Whole-screen string rendering applies only to these legacy screens.

Dispatch commands for persisted edits; never mutate live state or call `store.run` from screens. Keep demo state independent of the real save.

Reuse the nearby `node:test` helpers; assert behavior and reason codes rather than generated IDs. Check: `npm test`, `npm run typecheck`; smoke changed legacy routes.
