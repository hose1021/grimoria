# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Butler (r3120) and States (r1039) text and the
      Butler `rule.md`. Rules check: compliant.
- [x] 1.2 Add seven characterization tests to `engine.test.ts` on the
      untouched branch: the master record, the effect, step and log records,
      the draw order on the command clock and identifier stream, the earlier
      record left to expire, the inactive record of an impaired choice, a
      wasted choice that does not bind a healthy Butler, the self-target
      rejection, the command events, and preview/apply/replay/export on the
      command path.

## 2. Contract

- [x] 2.1 Add the `record-master` intent.
- [x] 2.2 Add `butler` to `TimedEffectKind`.
- [x] 2.3 State the meaning of a dated effect on the `suppressed` path in the
      contract comments.
- [x] 2.4 Add compile-time checks: a role cannot name the seat of the master
      record and cannot choose whether a dated effect applies.

## 3. Coordinator

- [x] 3.1 Apply `record-master` on the acting seat.
- [x] 3.2 On the `suppressed` path keep a `timed-effect` as an inactive record
      with the same id draw, and skip `replacesPrevious`.
- [x] 3.3 Cover 3.2 with a coordinator test that uses a stub module.

## 4. Role

- [x] 4.1 Move the Butler rule to `butler/role.ts` as a `night-step`
      capability for every night; remove its branch and the unused import from
      `night.ts`.
- [x] 4.2 Update the Butler `rule.md` and the `docs/rules-matrix.md` row with
      the new implementation text and asserting tests.

## 5. Ledger and documents

- [x] 5.1 Regenerate `docs/role-ownership.md` (engine branch 59 to 58, typed
      capability with an engine reference 9 to 10); move the classifier
      example to the Soldier and add a test for the Butler row.
- [x] 5.2 Update `docs/architecture.md`, `docs/rules-sources.md` and the slice
      2 note in ADR 0002.

## 6. Verification

- [x] 6.1 The characterization tests pass unchanged after the move.
- [x] 6.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change; all 600 state and result digests are equal.
- [x] 6.3 `npm run verify` passes on Node 24.
- [x] 6.4 `node --test scripts/*.test.ts` passes.
- [x] 6.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; the Butler step is checked at 390 px with a real game.
- [x] 6.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the Butler role test and the lookup test (`node --test` over
  `src/core/roles/butler/role.test.ts` and
  `src/core/roles/night-step.test.ts`), written before the move with the rule
  still in `night.ts`, reported 16 tests, 10 passed, 6 failed. Every failure
  was the Butler module declaring no resolver: the engine branch still owned
  the rule.
- GREEN: the same command reports 16 tests, 16 passed after the move.
- GREEN: the seven characterization tests passed on the untouched branch
  (798 tests, main 791 plus 7) and pass unchanged after the move. A replay
  test for an impaired choice was added afterwards; it passes on this change
  and on the untouched main.
- GREEN: `npm test` reports 806 tests, 806 passed, 0 failed.
- GREEN: the seeded driver reported the same digest for 600 games on main
  `58793f9` and on this change. The games completed 8,105 night steps, 252 of
  them Butler choices (13 made while impaired), recorded 1,445 votes, and all
  600 journals replayed to the same state.
- GREEN: mutation checks show the proof reads the right facts. A wasted
  record left active changed the digest and failed 3 tests; a master that is
  not recorded changed the digest and failed 4 tests; a wrong expiry changed
  the digest and failed 6 tests; an effect id taken from the system ports
  changed the digest, broke 45 of 180 replays and failed 11 tests; a wasted
  effect that still replaces failed the coordinator test. Each mutation was
  reverted.
- GREEN: `npm run verify` on Node 24 exited 0: typecheck, oxlint, format
  check, 806 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles) and the ownership
  ledger.
- GREEN: `node --test scripts/*.test.ts` reports 110 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios, including
  `tb-15-demon-chain`, where the Butler serves the Mayor.
- GREEN: at 390 px, a seeded eight-player game went through the table
  controls. Night 1: the Butler step with the Butler's own seat not
  selectable, a choice with the master note, the master on the seat and one
  working effect; the Butler was bound on day 1. Night 2: the Poisoner
  poisoned the Butler, the choice showed the failure note, the new master was
  still recorded and the effect was inactive; the Butler was not bound on day
  2. The page had no console error, no failed request and no horizontal
  overflow.
