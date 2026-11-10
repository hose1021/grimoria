# Tasks

Implementation starts only after the owner accepts this proposal. Each stage is
a separate commit on the same branch, so a regression can be reverted alone.
The twelve `.mjs` suites and `npm run typecheck` run after every stage.

## 1. Baseline

- [x] 1.1 Record `npm test`, `npm run typecheck` and `node scripts/check-types-policy.mjs` on the branch start.
- [x] 1.2 Add a test that imports every name from `js/engine.js` and `js/model.js`, so a shim cannot silently lose an export.

## 2. Static data layer

- [x] 2.1 Move `js/effect-graph.js` to `src/core/model/effect-graph.ts`.
- [x] 2.2 Move `js/rules.js` to `src/core/model/rules.ts`.
- [x] 2.3 Move `js/scripts.js` to `src/core/model/scripts.ts`.
- [x] 2.4 Move `js/model.js` to `src/core/model/state.ts`; keep `src/core/model/index.ts` as the public surface.

## 3. Engine

- [x] 3.1 Move `engine/runtime.js` and `engine/context.js`.
- [x] 3.2 Move `engine/effects.js` and `engine/information.js`.
- [x] 3.3 Move `engine/setup.js` and `engine/night.js`.
- [x] 3.4 Move `engine/death.js` and `engine/day.js`.
- [x] 3.5 Move `engine/corrections.js`, `engine/bmr.js` and `engine/sv.js`.
- [x] 3.6 Move `engine/commands.js`; export the registry from `src/core/engine/index.ts`.

## 4. Compatibility and store

- [x] 4.1 Turn `js/engine.js`, `js/model.js`, `js/rules.js`, `js/scripts.js` and `js/effect-graph.js` into re-export shims.
- [x] 4.2 Remove `CommandExecutor` and `StateCodec` from `src/application/ports`; drop the `executor` and `codec` parameters from `createGameStore`.
- [x] 4.3 Let `application` import the core command registry and codec; shrink `js/composition.js` to adapters plus the store call.
- [x] 4.4 Delete `js/log.js`, `js/night.js` and `js/night.test.mjs`.

## 5. Type and boundary policy

- [x] 5.1 Enable `erasableSyntaxOnly` in `tsconfig.core.json`; add `src/core/model` to its include.
- [x] 5.2 Extend `scripts/check-types-policy.mjs`: no `src` module imports `js/` at all, and every shim has a matching test import.
- [x] 5.3 Add a negative fixture per new rule to `scripts/check-types-policy.test.mjs`.

## 6. Documentation and gate

- [x] 6.1 Update `AGENTS.md`, `SPEC.md` and `docs/architecture.md` ownership tables.
- [x] 6.2 Update `openspec` baseline rows that name `js/engine.js` as the engine home.
- [x] 6.3 Run `npm run verify`, `node scripts/openspec-check.mjs` and the Playwright checks.
- [x] 6.4 Open the pull request, report the checks and wait for the owner.

## Evidence

- RED: `js/shim-exports.test.mjs` failed on `buildSvNightQueue` while the engine
  shim missed the re-export, and `js/store.test.mjs` failed on the legacy v3
  load because the store had replaced the migrating codec with a bare
  validator. Both failures reproduced the risk before the fix.
- GREEN: `npm run verify` → typecheck 0 errors, 257/257 tests, Vite build,
  `dist/404.html`, `dist/sw.js` (403 assets), boundary policy passed;
  `node scripts/openspec-check.mjs` → 16 specs. The `.mjs` suites assert the
  same behavior through the shims, and the Playwright checks run in CI.
