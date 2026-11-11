# Tasks

## 1. RED: executable invariants

- [x] 1.1 Add `js/invariants.test.mjs` with one behavioural test per invariant from issue #32: one character and no dangling references; spent once-per-game abilities and no dead wakes without an exception; source-end rules per role; no final win before mandatory effects and Demon replacement; replay, undo plus replay and command idempotency.
- [x] 1.2 Add the corrupt-reference table: duplicate seat, missing seat player, character outside the script, unknown shown character, dangling effect source and target, death and execution players, night actor, active nomination, nomination players, morning death, day execution, Butler master, setup references and Mastermind player.
- [x] 1.3 Run `node --test js/invariants.test.mjs`; the reference table must fail on the checks `checkInvariants` does not yet perform.
- [x] 1.4 Record the RED command and the failing assertion in the Evidence section.

## 2. GREEN: complete the invariant gate

- [x] 2.1 Add the missing player-reference checks to `checkInvariants` in `src/core/engine/commands.ts` without touching `setOrder` or the effect graph.
- [x] 2.2 Re-run `node --test js/invariants.test.mjs` and confirm the reference table passes.
- [x] 2.3 Run `npm test` and confirm the existing suites still pass.

## 3. Verification

- [x] 3.1 Run `npm run format`.
- [x] 3.2 Run `npm test` and record the pass count.
- [x] 3.3 Run `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` and `openspec validate --specs --strict`.
- [x] 3.4 Run `git diff --check` and confirm a clean worktree after the commit.
- [ ] 3.5 Open the pull request, report the RED/GREEN evidence and stop; no merge.

## Evidence

- RED: `node --test js/invariants.test.mjs` -> 5 tests, 4 pass, 1 fail: "a nomination points at a missing nominator must break the invariant: []". `checkInvariants` accepted dangling nominations, morning deaths, day executions, Butler masters, setup references and Mastermind players.
- GREEN: `node --test js/invariants.test.mjs` -> 5 tests, 5 pass, 0 fail.
- GREEN: `npm test` -> 344 tests, 344 pass, 0 fail.
- GREEN: `npm run verify`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict` and `git diff --check` pass.
