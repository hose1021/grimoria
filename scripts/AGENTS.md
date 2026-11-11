# Build and policy tooling

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Use Node built-ins and existing helpers before adding dependencies. Keep runtime artifacts under `dist/` and reuse `base-path.mjs` for URL normalization.

Policy checks must reject violations rather than silently repairing or relaxing them. Update focused script tests for meaningful scanner or toolchain changes.

The offline generator hashes the built artifact; preserve explicit user-confirmed activation during a saved game. The dist server must reproduce Pages 404 behavior.

Check: `node --test scripts/*.test.mjs`, `node scripts/check-toolchain.mjs`, `node scripts/check-types-policy.mjs` and `npm run verify` for build/policy changes.
