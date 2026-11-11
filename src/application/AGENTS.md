# Application orchestration

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Coordinate commands, persistence and read models through the existing ports; import core directly, never concrete infrastructure, UI or the legacy runtime tree.

Keep domain rules in core and browser APIs in infrastructure. Adapt domain result unions at the existing dispatch boundary rather than adding assertions in callers.

Check: `node --test src/application/**/*.test.ts` and `npm run typecheck`.
