# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Poisoner (r1737), Monk (r3124), States (r1039) and
      Drunk (r3165) text and the `rule.md` of both roles. Rules check:
      compliant.
- [x] 1.2 Add nine characterization tests to `engine.test.ts` on the untouched
      branches: effect, step and log records, the draw order on the command
      clock and identifier stream, replacement, the impaired path, the Drunk
      shown the Monk, and preview/apply/replay/export on the command path.

## 2. Contract

- [x] 2.1 Add the `night-step` arm to `RoleCapability` with `NightTiming`.
- [x] 2.2 Add the `timed-effect` intent and `TimedEffectKind`.
- [x] 2.3 Add `AbilityContext.nameOf`; update the Gambler and Pukka test
      fixtures.
- [x] 2.4 Add compile-time checks: no invented effect kind, no role-chosen
      effect id, no game state in the night-step context.

## 3. Lookup and coordinator

- [x] 3.1 Add `src/core/roles/night-step.ts` with `firstNightStepOf`,
      `otherNightStepOf`, `nightStepFor` and `nightResolverFor`.
- [x] 3.2 Move the nine direct reads of `nightStep`, `firstNightStep` and
      `ability` in `night.ts`, `bmr.ts` and `sv.ts` to the lookup.
- [x] 3.3 Apply `timed-effect` in `engine/ability.ts` with the id from the
      command ports and the replacement of the source's earlier effect.
- [x] 3.4 Dispatch the Trouble Brewing step completion through
      `applyRoleAbility` and the shared `finishStep`.
- [x] 3.5 Add the registry rules: one form per module, and the arm timing
      agrees with the printed night order of the edition.

## 4. Roles

- [x] 4.1 Move the Poisoner rule to `poisoner/role.ts`; remove its branch from
      `night.ts`.
- [x] 4.2 Move the Monk rule to `monk/role.ts`; remove its branch from
      `night.ts`.
- [x] 4.3 Update both `rule.md` files and the `docs/rules-matrix.md` rows with
      the new implementation text and asserting tests.

## 5. Ledger and documents

- [x] 5.1 Report only the arms of a `capabilities` array in
      `scripts/role-ownership.ts`; regenerate `docs/role-ownership.md`
      (capability only 1 to 3, engine branch 61 to 59).
- [x] 5.2 Update `docs/architecture.md`, `docs/rules-sources.md`, `AGENTS.md`
      and the migration note in ADR 0002.

## 6. Verification

- [x] 6.1 The nine characterization tests pass unchanged after the move.
- [x] 6.2 A seeded driver plays 200 games per edition through `applyCommand`
      on the base commit and on this change; all 600 state and result digests
      are equal.
- [x] 6.3 `npm run verify` passes on Node 24.
- [x] 6.4 `node --test scripts/*.test.ts` passes.
- [x] 6.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; the night console is checked at 390 px with a real game.
- [x] 6.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.
- [x] 6.7 Merge main `98b0c17` (Lunatic default bluffs) and repeat 6.2 to
      6.6 on the merged tree.

## Evidence

- RED: the two role tests and the lookup test (`node --test` over
  `src/core/roles/poisoner/role.test.ts`, `src/core/roles/monk/role.test.ts`
  and `src/core/roles/night-step.test.ts`), with the contract in place and the
  rules still in `night.ts`, reported 21 tests, 10 passed, 11 failed. Every
  failure was a module that declared no `night-step` arm or resolver: the
  engine branch still owned the rule.
- GREEN: the same command reports 21 tests, 21 passed after the move.
- GREEN: the nine characterization tests in `src/core/engine/engine.test.ts`
  passed on the untouched branches (767 tests, base 758 plus 9) and pass
  unchanged after the move.
- GREEN: `npm test` reports 788 tests, 788 passed, 0 failed. After the merge
  of main `98b0c17` it reports 791 tests, 791 passed: the three new tests come
  from the merged Lunatic fix.
- GREEN: the seeded driver reported the same digest for 600 games on base
  `48724a2` and on this change. The games completed 8,105 night steps, 280 of
  them Poisoner and 192 Monk, and all 600 journals replayed to the same state.
  The run was repeated after the merge, main `98b0c17` against the merged
  tree: the digests are equal again.
- GREEN: mutation checks show the proof reads the right facts. Taking the
  effect id from the system ports changed the digest, broke 39 of 180 replays
  and failed 6 characterization tests; a wrong poison expiry failed 5 tests;
  dropping the replacement changed the digest. Each mutation was reverted.
- GREEN: `npm run verify` on Node 24 exited 0 before and after the merge of
  main: typecheck, oxlint, format check, the unit tests, build, fallback,
  offline, source policy, official provenance (82 entries), acceptance (72
  matrix roles) and the ownership ledger.
- GREEN: `node --test scripts/*.test.ts` reports 109 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios, including
  `tb-15-demon-chain` (Poisoner) and `tb-8-day-powers` (Poisoner, Monk).
- GREEN: at 390 px, a seeded eight-player game went through the table
  controls: the Poisoner step on night 1 (no Monk step in the queue), a new
  Poisoner choice and the Monk step on night 2, then the Imp attack on the
  protected player with no death. The effect records, notes and badges
  matched, the Monk's own seat was not selectable, the page had no console
  error, no failed request and no horizontal overflow.
