# Tasks

## 1. Evidence baseline

- [x] 1.1 Read the pinned snapshots for the five boundaries — Monk r3124,
      Fool r2636, Assassin r1786, Fang Gu r2974, Mastermind r2993 — and record
      the exact section behind each assertion. Verify with
      `node scripts/check-official.ts` and record its result.
- [x] 1.2 Map the current stage owners and every writer call site with
      `grep -n` over `src/core/engine` and `src/core/roles`; record the file and
      line for `kill`, `setWinner`, `replaceCharacter`, `swapCharacters`,
      `becomeDemon` and the effect pushes. Verify the owner counts with
      `node scripts/role-ownership.ts --check`.
- [x] 1.3 Run the existing baseline and record the result:
      `node --test src/core/engine/engine.test.ts src/core/engine/bmr.test.ts src/core/engine/snv.test.ts src/core/engine/commands.test.ts`.

## 2. Coordinator boundary suite

- [x] 2.1 Add `src/core/engine/coordinator.test.ts` with the boundary manifest,
      the guard names and the five pinned revisions. Verify the manifest test
      fails when one boundary is removed from the list, then restore it.
- [x] 2.2 Add the protection-before-redirect fixture: Monk protects the Mayor,
      the Imp attacks, no death, no redirect option. Verify with
      `node --test --test-name-pattern="protection" src/core/engine/coordinator.test.ts`.
- [x] 2.3 Add the earlier-protection-versus-Fool fixture: Tea Lady and
      Innkeeper prevention leave `used.fool` unset and the Fool alive. Verify
      with the `fool` pattern.
- [x] 2.4 Add the bypass-versus-impairment fixture: a sober Assassin kills a
      protected Tea Lady neighbour; an impaired Assassin kills nobody. Verify
      with the `assassin` pattern.
- [x] 2.5 Add the death-before-transformation fixture: the first Fang Gu jump
      records the old Demon's death, the Outsider's new evil Fang Gu character
      and no intermediate winner. Verify with the `fang-gu` pattern.
- [x] 2.6 Add the transformation-before-win fixture: a Demon execution with a
      living Mastermind yields no good winner, and the extra day decides.
      Verify with the `mastermind` pattern.
- [x] 2.7 Add the atomicity fixtures: the Mayor redirect choice changes no
      record, a Slayer shot on the last Demon commits death and win together,
      and a failed save restores the pre-command state. Verify with
      `node --test src/core/engine/coordinator.test.ts src/core/engine/commands.test.ts`.
- [x] 2.8 If a boundary fails, record the RED command and error, fix the shared
      function that owns the stage, then record GREEN with the same command. If
      the source shows a rules conflict instead of a defect, stop and ask the
      owner with the pinned `oldid`.

## 3. Writer ownership check

- [x] 3.1 Extend `src/core/roles/architecture.test.ts` with the writer
      allowlist, comment stripping and the non-engine scan. Verify
      `node --test src/core/roles/architecture.test.ts` passes on the baseline
      tree.
- [x] 3.2 Unit-test the detector against a temporary file that calls `kill(`
      from a role path and a clean file, so the check itself cannot silently
      stop matching. Verify the same test command.
- [x] 3.3 Add a temporary new engine file calling `setWinner` outside the
      allowlist; verify the test fails and names it, then delete the file.

## 4. Documentation and spec evidence

- [x] 4.1 Add the coordinator suite and ownership check to the ADR 0002
      "Verification" section and to `docs/role-ownership.md` "How to read a
      row" where the owner counts are explained. Verify the ADR links resolve
      with `node scripts/check-docs-links.ts` if it exists; otherwise record
      the manual read.
- [x] 4.2 Regenerate the ownership ledger only if a role module or engine
      reference changed: `node scripts/role-ownership.ts`, then
      `node scripts/role-ownership.ts --check`.
- [x] 4.3 Verify the change contract:
      `openspec validate intent-effect-coordinator --type change --strict` and
      `node scripts/openspec-check.ts`.

## 5. Integration verification

- [x] 5.1 Run `npm run typecheck` and `npm run lint`; record both results.
- [x] 5.2 Run `npm run format:check`; fix formatting with `npm run format` only
      in the files this change touched.
- [x] 5.3 Run `npm test`; record the pass/fail counts and the new suite count.
- [x] 5.4 Run `npm run verify`; if a check fails, prove whether it reproduces
      on `origin/main` and report the exact command.
- [x] 5.5 Confirm `git diff --stat -- src` lists only test files, so no runtime
      engine or UI path changed; the coordinator suite is the behavioral proof
      and a screen walkthrough adds no signal. The diff is recorded below.

## 6. Delivery

- [x] 6.1 Review `git diff --stat` and `git status --short`; confirm only the
      test file, the architecture test, the two spec deltas, the design,
      proposal, tasks and the documentation lines changed.
- [x] 6.2 Commit with a Conventional Commit, push the branch and open a pull
      request that names issue #212 and this OpenSpec change; report the CI
      result and the exact SHA. Do not merge.

## Evidence

Pins read from `docs/official/wiki/`: Monk r3124 Summary and Examples (protected
Mayor triggers no redirect); Fool r2636 Examples (Tea Lady and Innkeeper
prevention leave the ability unspent); Assassin r1786 How to Run and Examples
(protection is bypassed, impairment still suppresses); Fang Gu r2974 Summary and
How to Run (the first Outsider becomes an evil Fang Gu, the old Demon dies);
Mastermind r2993 Summary (a Demon execution continues for one more day).

- RED: `node --test src/core/engine/coordinator.test.ts` first run failed 3/8. `bypass-versus-impairment` forced `recordBmrOutcome` after an impaired step; `transformation-before-win` called `endDay` after the Mastermind win was already declared; the Slayer death cause is `slayer`, not `ability`. All three were wrong test expectations, not engine defects; the fixtures and assertions were corrected.
- RED: removing the `protection-before-redirect` entry from the boundary list made `the coordinator manifest covers every stage boundary with a pin` fail; the entry was restored.
- RED: a temporary `src/core/engine/coordinator-probe.ts` calling `setWinner` made `shared resolution writers belong to the engine owners` fail with `src/core/engine/coordinator-probe.ts: shared writer setWinner`; the file was deleted.
- GREEN: `node --test src/core/engine/coordinator.test.ts` passes 8/8.
- GREEN: `node --test src/core/roles/architecture.test.ts` passes 4/4.
- GREEN: `node --test src/core/engine/coordinator.test.ts src/core/engine/commands.test.ts src/application/store/create-game-store.test.ts` passes 96/96.
- GREEN: `npm test` passes 773/773.
- GREEN: `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run verify` pass. `node scripts/check-official.ts` reports 82 entries and `node scripts/role-ownership.ts --check` reports the ledger current.
- GREEN: `openspec validate intent-effect-coordinator --type change --strict` and `node scripts/openspec-check.ts` pass.
- DIFF: `git diff --stat -- src` lists only `src/core/engine/coordinator.test.ts`, `src/core/roles/architecture.test.ts` and `src/application/store/create-game-store.test.ts`; no production engine or UI path changed.
- GREEN: PR [#260](https://github.com/hose1021/grimoria/pull/260) checks pass: Specifications, CI (Lint and format, Type check, Unit tests, Playwright regression checks) and Git conventions (Branch and pull request title).
- DELIVERY: branch `feat/intent-effect-coordinator`, PR [#260](https://github.com/hose1021/grimoria/pull/260). The first OpenSpec run failed on the PR body format (`Issue: #N` and `OpenSpec change:` lines); the body was corrected and the workflow retriggered.

## Workflow follow-up

- Archive the change after the owner merges the pull request and the project's
  review requirements are satisfied.
- Remove the worktree and delete the local branch after the merge.
