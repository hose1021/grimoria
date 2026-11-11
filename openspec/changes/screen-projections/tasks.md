# Tasks

Implementation starts only after the owner accepts this proposal. The change
adds the tests first, then moves each screen import to the read model. The
`.mjs` suites, `npm run typecheck` and `npm run verify` run after every stage.

## 1. Tests first

- [x] 1.1 Add `src/application/read-models/table.test.ts` with the table-driven command scenario and the projection equality assertions.
- [x] 1.2 Add `src/ui/screens/structure.test.ts` for the screen, UI and composition-root import boundaries.
- [x] 1.3 Record the RED run against the base tree.

## 2. Read models

- [x] 2.1 Add `src/application/read-models/table.ts` with the table, step, seat, target-bounds, role-choice, setup and secrets projections.
- [x] 2.2 Export `InfoResult` from `src/core/engine/information.ts` and `src/core/engine/index.ts`.
- [x] 2.3 Add `src/application/dispatch/preview.ts` and route `src/entry/main.ts` through it.

## 3. Screens

- [x] 3.1 Rewrite the night, day and deal cards to render the table and step projections.
- [x] 3.2 Rewrite the step dialog, the side panel and the effect badges to render the step and seat projections.
- [x] 3.3 Rewrite the bag and secrets screens to render the setup and secrets projections.

## 4. Documentation and gate

- [x] 4.1 Note the read-model import in `AGENTS.md`.
- [x] 4.2 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 4.3 Run the browser smoke check on `/bag`, `/secrets` and `/table`.
- [x] 4.4 Open the pull request, report the checks and wait for the owner.

## Evidence

- RED: on a `git archive 0e3ed96` tree with only the two new test files added,
  `node --test src/ui/screens/structure.test.ts src/application/read-models/table.test.ts`
  failed: `table.test.ts` could not import the missing read model, `structure`
  listed six screen imports of `core/engine/index.ts` (`bag`, `secrets`,
  `table/cards`, `table/dialogs`, `table/frame`, `table/parts`) and two
  composition-root imports (`core/engine/index.ts`, `core/engine/commands.ts`),
  and only the one passing case was the UI `js/` check.
- GREEN: `npm test` → 347/347 pass, including the table-driven projection
  scenario, the preview boundary and the three structure checks. `npm run verify`
  → typecheck, lint, format check, tests, Vite build, fallback page, offline
  worker (405 assets) and the source policy check all pass.
