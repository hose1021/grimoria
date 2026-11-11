# Typed application

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Keep dependencies directed inward; see [architecture](../docs/architecture.md) for the layer contract. The composition root wires concrete adapters; domain and application modules receive ports.

Use the existing TypeScript import extension convention in the touched module; do not rewrite imports as part of unrelated work.

Do not add browser globals to core/application or Node runtime imports to production code. Keep tests in the test TypeScript program.

Check: `npm run typecheck` and `node scripts/check-types-policy.mjs` from the repository root.
