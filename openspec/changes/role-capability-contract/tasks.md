# Tasks

## 1. Baseline and rules check

- [x] 1.1 Confirm `origin/main` is `26d94a6` with no open pull request and no
      active change that touches `src/core/roles/types.ts` or the Gambler.
- [x] 1.2 Read the pinned Gambler text at
      `docs/official/wiki/Gambler.r3073.wikitext` and compare it with the
      current Gambler branch. Record `Rules check: compliant`: the refactor
      changes no rule, pin, command or outcome.
- [x] 1.3 Baseline in the worktree: `npm run typecheck` passes and
      `node --test src/core/engine/bmr.test.ts` passes 109 tests.

## 2. Decision record and change

- [x] 2.1 Add `docs/adr/0001-role-capability-contract.md` with the contract,
      dependency direction, coordinator, rejected alternatives and the
      dependency-aware slice sequence for #200.
- [x] 2.2 Add this OpenSpec change: `proposal.md` (`Issue: #200`), `design.md`
      (code-level decisions, equivalence table, risks), the `game/role-modules`
      delta and these tasks.

## 3. Characterization before the move

- [x] 3.1 Add a Gambler characterization test to `src/core/engine/bmr.test.ts`
      for the death record (`cause`, `ability`, `bmr`) and a dead target. Run
      `node --test --test-name-pattern="Gambler" src/core/engine/bmr.test.ts`
      before the migration and record the passing result. The test asserts
      current behavior; it passes before and after.
- [x] 3.2 Add `src/core/roles/ability.test-d.ts` with the negative type checks:
      the context exposes no game state and an effect cannot carry an unknown
      kind. Verify with `npm run typecheck`.

## 4. Contract and coordinator

- [x] 4.1 Add the RED test `src/core/roles/gambler/role.test.ts`. It fails
      before the contract exists; the failure is recorded below.
- [x] 4.2 Add `src/core/roles/ability.ts` with `AbilityContext`, `RoleEffect`,
      `AbilityDecision` and `RoleAbility`, and add `ability?` to `RoleModule`.
- [x] 4.3 Move `setStepNote` from `night.ts` to `context.ts` and update the
      importers (`night.ts`, `bmr.ts`, `sv.ts`). No behavior change.
- [x] 4.4 Add `src/core/engine/ability.ts`: build the context, call the
      resolver, apply each intent through `kill()` and write the shared note for
      `suppressed`. Return `false` when the module declares no ability.
- [x] 4.5 Declare the Gambler ability in `src/core/roles/gambler/role.ts` and
      delete the Gambler branch from `completeBmrStep`. Dispatch once after the
      shared checks and the Goon trigger.
- [x] 4.6 Verify the RED test passes, the characterization test still passes,
      and `node --test src/core/engine/bmr.test.ts` passes 110 tests.

## 5. Evidence and documentation

- [x] 5.1 Update `src/core/roles/gambler/rule.md` and the Gambler row of
      `docs/rules-matrix.md` with the resolver owner and the new asserting tests;
      keep the official text, revision and level unchanged.
- [x] 5.2 Update `AGENTS.md`, `docs/rules-sources.md` and
      `docs/architecture.md` to describe the ability capability and the
      coordinator.

## 6. Verification

- [x] 6.1 Run `npm run typecheck`, `npm run lint`, `npm run format:check`,
      `node --test src/core/engine/bmr.test.ts`,
      `node --test src/core/roles/gambler/role.test.ts`,
      `node scripts/check-types-policy.ts`, `node scripts/openspec-check.ts`,
      `openspec validate --changes --strict`, `node scripts/check-acceptance.ts`
      and `npm test`; every check passes.
- [x] 6.2 Run the full `npm run verify`; it passes end to end.
- [x] 6.3 Run an independent review of the contract, the dependency direction,
      the equivalence proof and the missing host-decision paths; apply the
      findings and rerun the affected checks.
- [x] 6.4 Inspect `git diff` for unintended changes: no expected outcome, error
      code, command payload, schema, storage, privacy or UI change.

## 7. Delivery

- [x] 7.1 Commit in small conventional commits on
      `refactor/role-capability-contract`, push and open
      [pull request #201](https://github.com/hose1021/grimoria/pull/201) that
      names `Issue: #200` and `OpenSpec change: role-capability-contract`.
- [ ] 7.2 Report CI, the changed files, the checks and the remaining slices.
      Do not merge.

## Evidence

- RED: `node --test src/core/roles/gambler/role.test.ts` before the contract -
  5 tests, 0 pass, 5 fail. The first assertion reports `role.ability` as
  `undefined`; every resolution assertion compares `undefined` with a decision.
- GREEN: characterization baseline before the move -
  `node --test --test-name-pattern="Gambler" src/core/engine/bmr.test.ts` passes
  2 tests, including the new death-record and dead-target test. After the move
  the same command passes the same 2 tests; the full file passes 110 of 110
  (was 109 before the characterization test).
- GREEN: contract - `node --test src/core/roles/gambler/role.test.ts` passes 5 of
  5. `npm run typecheck` accepts the contract and rejects a context state access
  and an unknown effect kind. `npm run lint`, `npm run format:check` and
  `node scripts/check-types-policy.ts` pass.
- GREEN: specs - `node scripts/openspec-check.ts` passes 24 specs and 11 active
  changes; `openspec validate --changes --strict` passes 11 of 11.
- GREEN: acceptance - `node scripts/check-acceptance.ts` passes 72 matrix roles
  and 13 test files (12 before this change; the Gambler resolver test is cited).
- GREEN: suites - `npm test` passes 618 of 618 tests on Node 26.13.0, Windows.
  `npm run verify` passes end to end: typecheck, lint, format, 618 tests, build,
  fallback, offline (383 assets), source policy, official provenance (82
  entries) and the acceptance check.
- Rules check: compliant. `docs/official/wiki/Gambler.r3073.wikitext` says the
  Gambler chooses any player, dead or alive, and guesses their character; a
  wrong guess kills the Gambler, a correct guess does nothing and the Gambler is
  not told the result. The moved code keeps that behavior; the new
  characterization test pins the dead-target rule and the death record, and the
  resolver test pins the self-target rule.
- Review: independent `code-reviewer` subagent, verdict APPROVE with no blocker,
  one should-fix and five nits. Applied:
  - the recorded ability is derived from `module.id`, so `RoleEffect` no longer
    duplicates it and a module cannot mislabel its own death;
  - a self-target resolver test covers the last pinned sentence of the summary;
  - the ADR and design name the pre-existing `sv-common.ts` engine imports and
    the coordinator's membership in the existing engine component;
  - `suppressed` is documented as the engine's generic note, with a different
    variant required for Pukka's suspended poison;
  - the duplicate Gambler fixture is one helper.
  Retained without change: the reviewer's harness matched the deleted branch on
  impaired, wrong, correct, absent-guess, dead-target and self-target paths; the
  impaired-with-zero-target note difference is unreachable because the command
  path requires one target.

## Remaining slices for #200

The ADR owns the sequence. After this change:

1. Pukka: effect intents with a lifetime and a previous-victim fact.
2. The pending host-choice variant and the private day workflows (Artist,
   Savant, Mathematician, Dreamer).
3. Execution, death and transformation contributions.
4. The remaining Trouble Brewing, Bad Moon Rising and Sects & Violets branches,
   one reviewed slice at a time.
