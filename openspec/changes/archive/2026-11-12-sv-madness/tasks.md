# Tasks

## 1. RED: failing regressions

- [x] 1.1 Add the Cerenovus duration test: complete the night step with a target and a good character, then assert the stored token's source, target, character and expiry, that it is active during the madness day and inactive at the next night.
- [x] 1.2 Add the removal test: expired tokens are not active, and `manualCorrection` with the `effect` kind removes an active token.
- [x] 1.3 Add the execution-penalty test: `madnessPenalty` with `execute` kills the player through the day execution, records the `madness` cause, and stores the reason on the token and in the secret log.
- [x] 1.4 Add the declined-penalty, illegal-penalty, no-madness and empty-reason cases.
- [x] 1.5 Add the Mutant test: the token exists for the living Mutant, covers the Outsider requirement, and stops being active after a character change; the same penalty command applies.
- [x] 1.6 Add the projection test: the public game view and the public role view carry no madness data, and the player projection keeps only its documented keys.
- [x] 1.7 Record the RED command and the observed failure in the Evidence section.

## 2. GREEN: madness state

- [x] 2.1 Create the Cerenovus token in `completeSvStep` when the step has a target and a legal good character; keep the host note when the choice is missing.
- [x] 2.2 Export `activeMadness`, `madnessEffects`, `MADNESS_PENALTIES` and `applyMadnessPenalty` from `sv.ts` through `index.ts`.
- [x] 2.3 Let a Cerenovus token stay active without its source in `effectActive`; expiry still ends it.
- [x] 2.4 Reconcile the Mutant token from the character holder, its life and its impairment inside the existing S&V reconciliation.
- [x] 2.5 Add the `madnessPenalty` command to the contracts, the payload schema, the command type and the handler; run the execution with a `madness` cause.
- [x] 2.6 Extract the player seat projection into a pure module so the DOM-free test asserts its exact field set and that no madness token reaches it.

## 3. GREEN: verification

- [x] 3.1 Confirm the RED tests pass without weakening an existing test.
- [x] 3.2 Add the Cerenovus and Mutant `docs/rules-matrix.md` rows only, with status `host-choice` and the new test references.

## 4. REFACTOR

- [x] 4.1 Check for dead branches, stale comments and duplicated madness lookups.
- [x] 4.2 Rerun the full suite after cleanup.

## 5. Verification and documentation

- [x] 5.1 Run `npm run format`, `npm test`, `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check`.
- [x] 5.2 Write the pull request body to `/tmp/sv-madness-pr.md` and report the branch, SHA, title and evidence; do not merge.

## Evidence

- RED: `node --test js/snv.test.mjs` -> `SyntaxError: The requested module './engine.js' does not provide an export named 'MADNESS_PENALTIES'`; 0 pass, 1 fail. No madness state, penalty command or projection assertion existed before the change.
- GREEN: `node --test js/snv.test.mjs` -> 58 tests, 58 pass (8 new madness tests). `npm test` -> 403 tests, 403 pass (the new `src/ui/screens/player-projection.test.ts`). `npm run verify` passes (typecheck, lint, format check, tests, build, fallback, offline, source policy). `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check` pass.
- The seat-projection test is a characterization test: the handoff already projected only public fields, so it passed as soon as the pure module existed; it now pins the exact field set so a madness token cannot be added to it.
- Shared edit: `src/core/model/support.ts` and `js/support.test.mjs` moved the Mutant from `unsupported` to `requires-storyteller-choice` because its matrix row is now `host-choice`; the matrix-to-code equality assertion still runs, and only the expected role membership and the SNV counts (4 unsupported, 13 host-choice) changed. No test was weakened or removed.
