# Tasks

Implementation starts after the proposal. The gate after every stage:
`npm run typecheck`, `npm test`, `node scripts/openspec-check.mjs`.

## 1. Audit

- [x] 1.1 Read `src/core/model/state.ts`, `types.ts`, `effect-graph.ts` and `src/core/engine/effects.ts`, and map every notion in issue #28 to a field or a derivation.
- [x] 1.2 Write the map into `design.md` as `notion -> field -> test` / `notion -> derived, not stored` with the reason, and record that no field is missing so the schema stays v4.

## 2. Effect validation

- [x] 2.1 Write `src/core/model/state.test.ts` first: source, target, interval, malformed `start`/`expires`, open-ended effect, and the two migration cases.
- [x] 2.2 Run it and record the failure of the interval cases while `validateState` ignores `start` and `expires`.
- [x] 2.3 Require `start` to be a cycle marker and `expires` to be a cycle marker or absent/`null` in `validateState`; reuse one phase list for `phase` and the marker.
- [x] 2.4 Rerun the test file and the store, script, engine, BMR and Sects & Violets suites.
- [x] 2.5 Make `Effect.start` required in `src/core/model/types.ts` (the compiler flags no producer: every producer already sets it), and assert the exact source, target and interval errors in the tests.

## 3. Artifacts and verification

- [x] 3.1 Keep the change artifacts consistent: proposal names issue #28, the delta spec cites the pinned wiki sources, `design.md` holds the audit table.
- [x] 3.2 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 3.3 Open the pull request, report the checks and wait for the owner. Opened as PR #95 by the orchestrator, because `git push` is denied to agent sessions.

## Evidence

- RED: the final 9-test `src/core/model/state.test.ts` fails 6 of 9 against
  `main` at `c152cbc`: the four interval and migration assertions (`an effect
  without an interval is rejected`, `an effect with a malformed interval is
  rejected`, `an effect with a malformed expiry is rejected`, `migration does
  not invent an interval for an undated effect`) and the two exact-message
  assertions (`an effect without a source is rejected`, `an effect without a
  target is rejected`), because `validateState` emitted the generic
  `Invalid effect.`. The earlier 8-test draft failed 5 of those 8; the migration
  case was added afterwards.
- GREEN: `node --test src/core/model/state.test.ts` passes 9 of 9 (the two
  migration cases included); `node --test src/core/model/*.test.ts
  js/scripts.test.mjs js/store.test.mjs` passes 42 of 42; `node --test
  js/engine.test.mjs js/bmr.test.mjs js/snv.test.mjs js/commands.test.mjs`
  passes 147 of 147; `npm test` passes 276 of 276.
