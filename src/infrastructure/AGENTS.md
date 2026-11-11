# Browser adapters

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Implement application/core ports here; do not move game rules into adapters or import UI/entry modules.

Handle unavailable storage and quota errors explicitly through existing result/fallback contracts. Keep preferences separate from the game save.

Preserve `pg.game.v4`, revision handling and backup/recovery behavior. Inject platform clock/ID/seed implementations at boot, not inside domain logic.

Check: `node --test src/infrastructure/**/*.test.ts src/entry/store.test.ts` and `npm run typecheck`; exercise real browser failure paths when changing browser integration.
