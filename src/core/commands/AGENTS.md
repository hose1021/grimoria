# Command contracts

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Keep payload contracts, preparation, result unions and typed events aligned. Reject malformed payloads and unsupported ruleset versions at this boundary.

One logical action keeps its prepared ID and timestamp. Fingerprints bind type, canonical payload and ruleset version; preserve canonical key ordering and content-conflict rejection.

Use injected ID and clock ports. Do not duplicate game-rule execution here; execution belongs to the engine.

Check: `node --test src/core/commands/*.test.ts src/core/engine/commands.test.ts` and `npm run typecheck` for compile-time contract tests.
