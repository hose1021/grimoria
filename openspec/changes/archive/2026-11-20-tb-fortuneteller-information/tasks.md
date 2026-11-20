# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Fortune Teller (r3123), Recluse (r3007), Spy
      (r3118), Drunk (r3165) and States (r1039) text and the Fortune Teller
      `rule.md`. Rules check: compliant.
- [x] 1.2 Add twelve characterization tests to `engine.test.ts` on the
      untouched branch: the step as built on the first and on a later night;
      the answers for the Demon, the red herring, the Fortune Teller's own
      seat, a Minion and a missing seat; the step and log records and the draw
      order of a healthy step; the target errors that change nothing; an
      answer sent to a healthy step; the host question that changes nothing;
      the host's yes and the host's no as false information; a Recluse
      registered as the Demon, as evil only, and a refused Spy registration; a
      Drunk shown the Fortune Teller; preview, apply and replay on the command
      path; the host choice on the command path.

## 2. Contract

- [x] 2.1 Add `registersAsDemon` and `redHerringId` to the information
      context.
- [x] 2.2 Add compile-time checks: the information context exposes no host
      registrations and no setup secrets.

## 3. Engine

- [x] 3.1 Build the information context in one place (`informationFacts` in
      `information.ts`) with the two new facts, and use it in
      `moduleInfoForStep`.
- [x] 3.2 Cover 3.1 with an engine test that uses a stub module.
- [x] 3.3 Keep `fortuneTellerYes` as an exported query that resolves the
      module's capability with the engine's facts.
- [x] 3.4 Remove the Fortune Teller branch of `infoForStep`, its entry of
      `infoKindFor` and its name in the gate of `completeStep`.

## 4. Role

- [x] 4.1 Declare the Fortune Teller step as a `night-step` capability for
      every night with two players and the yes-or-no shape, and answer through
      an `information` capability with yes and no as the possible answers.
- [x] 4.2 Update the Fortune Teller `rule.md` and its `docs/rules-matrix.md`
      row with the new implementation text and asserting tests.

## 5. Ledger and documents

- [x] 5.1 Regenerate `docs/role-ownership.md` (the Fortune Teller row declares
      `capability:night-step` and `capability:information` and keeps
      `setup.ts`×3 and `information.ts`×1; 10 roles are a capability with an
      engine reference and 57 an engine branch) and add a test for the row.
- [x] 5.2 Update `docs/architecture.md` and the slice 2 note in ADR 0002.

## 6. Verification

- [x] 6.1 The characterization tests pass unchanged after the move.
- [x] 6.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change; all 600 state and result digests are equal.
- [x] 6.3 `npm run verify` passes on Node 24.
- [x] 6.4 `node --test scripts/*.test.ts` passes.
- [x] 6.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; the Fortune Teller step is checked at 390 px with a real game.
- [x] 6.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the Fortune Teller role test and the lookup test (`node --test` over
  `src/core/roles/fortuneteller/role.test.ts` and
  `src/core/roles/night-step.test.ts`), written before the move with the rule,
  the shape and the options still in the engine, reported 18 tests, 11 passed,
  7 failed. Every failure was the Fortune Teller module declaring the legacy
  step and no `information` capability.
- GREEN: the same command reports 18 tests, 18 passed after the move.
- GREEN: the twelve characterization tests passed on the untouched branch (862
  tests, main 850 plus 12) and pass unchanged after the move.
- GREEN: `npm test` reports 869 tests, 869 passed, 0 failed.
- GREEN: the seeded driver reported the same digest for 600 games on main
  `a7dd708` and on this change. 8,253 accepted night step commands completed
  8,242 steps, 268 of them Fortune Teller steps: 166 stored the computed
  answer (114 yes and 52 no), 68 healthy steps stored an answer the host sent,
  and 34 impaired steps stored the host's answer (14 yes and 20 no). The red
  herring was among the chosen players on 91 steps, a dead player on 44 and
  the Fortune Teller's own seat on 19. 26 Fortune Teller steps were sent with
  a registration. On 9 Fortune Teller steps the driver first sent the step
  without an answer and then with a value that was not offered; each attempt
  came back as a host choice, the second with `error.66`. All 600 journals
  replayed to the same state.
- GREEN: mutation checks show the proof reads the right facts. Twenty-one
  single changes were made and reverted, and each failed at least one test.
  In the role: only yes as a possible answer failed 10 tests, no listed
  before yes 9, the red herring ignored 5, the Demon registration ignored 9,
  both players required 12, an answer for a seat that does not exist 1, the
  real character instead of the registration 4, one target 16, no answer
  shape 13, the first night only 3, and an answer that differs for an
  impaired owner 4. In the engine: host registrations ignored for the Demon
  fact failed 3, no red herring 5, the top-level herring only 5, the query
  without registrations 1, the query answering no 4, the targets of the
  stored step only 8, no host question for an impaired owner 10, a completion
  gate that does not see the capability 22, a step built without the declared
  shape 11, and a Demon fact that includes any evil player 4. Eleven of the
  changes were also replayed through the seeded driver, and each changed the
  600-game digest, in 3 to 127 games.
- GREEN: `npm run verify` on Node 24 exited 0: typecheck, oxlint, format
  check, 869 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles) and the ownership
  ledger.
- GREEN: `node --test scripts/*.test.ts` reports 113 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios.
- GREEN: at 390 px, a seeded game of eight players went through the table
  controls with the Chef as the red herring. Night 1: the step takes two
  players, the Fortune Teller chooses the Imp and the Monk, the sheet shows
  yes, asks no false-information question and offers the Recluse's Demon
  registration unchecked; the step stores the computed answer. Night 2: the
  Poisoner chooses the Fortune Teller, the sheet asks for the answer with yes
  and no and nothing pre-selected, the confirm button stays disabled until
  the host answers, and the host's yes is journaled as false information
  after the step line. Night 3: the red herring and the dead Monk read as
  yes. Night 4: the Recluse and the Fortune Teller's own seat read as no; the
  host registers the Recluse as the Demon, the sheet shows yes, the step
  stores it and the registration is journaled before the step line. Night 5:
  the Mayor and a dead Soldier read as no. The page had no console error, no
  failed request and no horizontal overflow.
- GREEN: `node scripts/openspec-check.ts` passed (24 specs, 38 active
  changes); `openspec validate --changes --strict` reported 38 passed and
  `--specs --strict` 24 passed.
