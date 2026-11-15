# Build and policy tooling

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Every first-party file under `scripts/` is strict TypeScript and runs directly on Node (type stripping, no build step). `tsconfig.scripts.json` type-checks it, and `node scripts/check-toolchain.ts` fails on a `.js`, `.mjs`, `.cjs` or `.jsx` file here. Installed packages (`node_modules`), built output (`dist`) and the committed locale data in `public/assets/data/*.js` are outside that rule.

Use Node built-ins and existing helpers before adding dependencies. Keep runtime artifacts under `dist/` and reuse `base-path.ts` for URL normalization.

Policy checks must reject violations rather than silently repairing or relaxing them. Update focused script tests for meaningful scanner or toolchain changes.

The offline generator hashes the built artifact; preserve explicit user-confirmed activation during a saved game. The dist server must reproduce Pages 404 behavior.

`browser-check.ts`, `style-parity.ts` and `scenario-kit.ts` reach Playwright through `PLAYWRIGHT_MODULE`; `playwright.ts` is the boundary type for it, and `page-globals.d.ts` types the browser globals the checks install.

Check: `node --test scripts/*.test.ts`, `npm run typecheck`, `node scripts/check-toolchain.ts`, `node scripts/check-types-policy.ts` and `npm run verify` for build/policy changes.
