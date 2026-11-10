# Tasks

Implementation starts only after the owner accepts this proposal. Each stage is
a separate commit on the same branch, so a regression can be reverted alone.
The twelve `.mjs` suites and `npm run typecheck` run after every stage.

## 1. Baseline

- [ ] 1.1 Record `npm test`, `npm run typecheck` and `node scripts/check-types-policy.mjs` on the branch start.
- [ ] 1.2 Add a test that imports every name from `js/engine.js` and `js/model.js`, so a shim cannot silently lose an export.

## 2. Static data layer

- [ ] 2.1 Move `js/effect-graph.js` to `src/core/model/effect-graph.ts`.
- [ ] 2.2 Move `js/rules.js` to `src/core/model/rules.ts`.
- [ ] 2.3 Move `js/scripts.js` to `src/core/model/scripts.ts`.
- [ ] 2.4 Move `js/model.js` to `src/core/model/state.ts`; keep `src/core/model/index.ts` as the public surface.

## 3. Engine

- [ ] 3.1 Move `engine/runtime.js` and `engine/context.js`.
- [ ] 3.2 Move `engine/effects.js` and `engine/information.js`.
- [ ] 3.3 Move `engine/setup.js` and `engine/night.js`.
- [ ] 3.4 Move `engine/death.js` and `engine/day.js`.
- [ ] 3.5 Move `engine/corrections.js`, `engine/bmr.js` and `engine/sv.js`.
- [ ] 3.6 Move `engine/commands.js`; export the registry from `src/core/engine/index.ts`.

## 4. Compatibility and store

- [ ] 4.1 Turn `js/engine.js`, `js/model.js`, `js/rules.js`, `js/scripts.js` and `js/effect-graph.js` into re-export shims.
- [ ] 4.2 Remove `CommandExecutor` and `StateCodec` from `src/application/ports`; drop the `executor` and `codec` parameters from `createGameStore`.
- [ ] 4.3 Let `application` import the core command registry and codec; shrink `js/composition.js` to adapters plus the store call.
- [ ] 4.4 Delete `js/log.js`, `js/night.js` and `js/night.test.mjs`.

## 5. Type and boundary policy

- [ ] 5.1 Enable `erasableSyntaxOnly` in `tsconfig.core.json`; add `src/core/model` to its include.
- [ ] 5.2 Extend `scripts/check-types-policy.mjs`: no `src` module imports `js/` at all, and every shim has a matching test import.
- [ ] 5.3 Add a negative fixture per new rule to `scripts/check-types-policy.test.mjs`.

## 6. Documentation and gate

- [ ] 6.1 Update `AGENTS.md`, `SPEC.md` and `docs/architecture.md` ownership tables.
- [ ] 6.2 Update `openspec` baseline rows that name `js/engine.js` as the engine home.
- [ ] 6.3 Run `npm run verify`, `node scripts/openspec-check.mjs` and the Playwright checks.
- [ ] 6.4 Open the pull request, report the checks and wait for the owner.

## Evidence

- RED: the export test in task 1.2 fails at the branch start because the shim
  import surface is not asserted yet; `npm test` and `npm run typecheck` record
  the grey baseline in the pull request.
- GREEN: `npm run verify`, `node scripts/openspec-check.mjs` and the Playwright
  checks pass after task 6.3, with the `.mjs` suites asserting the same
  behavior through the shims.
