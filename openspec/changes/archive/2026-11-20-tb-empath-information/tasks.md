# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Empath (r1724), Spy (r3118), Recluse (r3007), Drunk
      (r3165) and States (r1039) text and the Empath `rule.md`. Rules check:
      compliant.
- [x] 1.2 Add ten characterization tests to `engine.test.ts` on the untouched
      branch: the step as built on the first and on a later night; the step
      and log records and the draw order of a healthy step; an answer sent to
      a healthy step; the host question that changes nothing; the host's 2 and
      the host's 0 as false information; the journaled registration before the
      step line; a Drunk shown the Empath; preview, apply and replay on the
      command path; the host choice on the command path.

## 2. Contract

- [x] 2.1 Add `possible` to the `answer` decision of the `information`
      capability.
- [x] 2.2 Add compile-time checks: the information context exposes no game
      state, and a role cannot mark its answer as false, require the host's
      answer or name the options of one step.
- [x] 2.3 Add `informationOf` to the lookup in `src/core/roles/night-step.ts`.

## 3. Engine

- [x] 3.1 Add `moduleInfoForStep` to `information.ts`: one path for a module
      that owns its answer, with the shape from the declared step and the
      options from the role only when the owner is impaired.
- [x] 3.2 Cover 3.1 with six engine tests that use a stub module.
- [x] 3.3 Read the answer shape of a step from the declared step in
      `makeRoleStep`, and enter the information gate of `completeStep` for a
      module that declares the capability.
- [x] 3.4 Remove the Empath branch, `empathCount` and its export from the
      engine, and the Empath entry of `infoKindFor`.

## 4. Role

- [x] 4.1 Declare the Empath step as a `night-step` capability for every
      night with the number shape, and name 0, 1 and 2 as the possible
      answers of its `information` capability.
- [x] 4.2 Update the Empath `rule.md` and its `docs/rules-matrix.md` rows with
      the new implementation text and asserting tests.

## 5. Ledger and documents

- [x] 5.1 Regenerate `docs/role-ownership.md` (the Empath row declares
      `capability:night-step` and `capability:information` with no engine
      reference; 4 roles are owned by a capability alone and 9 keep an engine
      reference) and add a test for the Empath row.
- [x] 5.2 Update `docs/architecture.md` and the slice 2 note and the
      information decision sketch in ADR 0002.

## 6. Verification

- [x] 6.1 The characterization tests pass unchanged after the move.
- [x] 6.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change; all 600 state and result digests are equal.
- [x] 6.3 `npm run verify` passes on Node 24.
- [x] 6.4 `node --test scripts/*.test.ts` passes.
- [x] 6.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; the Empath step is checked at 390 px with a real game.
- [x] 6.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the Empath role test and the lookup test (`node --test` over
  `src/core/roles/empath/role.test.ts` and
  `src/core/roles/night-step.test.ts`), written before the move with the shape
  and the options still in the engine, reported 17 tests, 12 passed, 5 failed.
  Every failure was the Empath module declaring the legacy step and no
  possible answers.
- GREEN: the same command reports 17 tests, 17 passed after the move.
- GREEN: the ten characterization tests passed on the untouched branch (837
  tests, main 827 plus 10) and pass unchanged after the move.
- GREEN: `npm test` reports 850 tests, 850 passed, 0 failed.
- GREEN: the seeded driver reported the same digest for 600 games on main
  `ed621be` and on this change. The games completed 8,270 night steps, 256 of
  them Empath steps: 160 stored the computed count (66 zeros, 83 ones and 11
  twos), 70 healthy steps stored an answer the host sent, and 26 impaired
  steps stored the host's number (4 zeros, 11 ones and 11 twos). 23 Empath
  steps were sent with a registration. On 95 steps of 17 information roles, 4
  of them Empath steps, the driver first sent the step without an answer and
  then with a value that was not offered; each Empath attempt came back as a
  host choice, the second with `error.66`. All 600 journals replayed to the
  same state.
- GREEN: mutation checks show the proof reads the right facts. Eighteen
  single changes were made and reverted, and each failed at least one test.
  In the role: a shorter list of possible answers failed 8 tests, a count of
  good neighbours 8, a count by the real character instead of the registered
  team 2, a step without the number shape 12, and an answer that differs for
  an impaired owner 1. In the engine: no host question for an impaired owner
  failed 7, options offered to a healthy owner 5, ignored registrations 2, a
  step built without the declared shape 5, a completion gate that does not
  see the capability 10, the capability name used as the answer shape 13, the
  stored answer with its keys in another order 1, impairment not read 9,
  another seat as the actor 8, a lookup that finds no capability 24, and the
  three stub-only facts (a role that learns nothing, the targets of the
  command, a copy of the role's list) 1 each. Eleven of the changes were also
  replayed through the seeded driver, and each changed the 600-game digest,
  in 3 to 80 games.
- GREEN: `npm run verify` on Node 24 exited 0: typecheck, oxlint, format
  check, 850 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles) and the ownership
  ledger.
- GREEN: `node --test scripts/*.test.ts` reports 112 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios.
- GREEN: at 390 px, a seeded game of eight players went through the table
  controls with the Empath between a Recluse and the Imp. Night 1: the step
  takes no target, the sheet shows the count 1, asks no false-information
  question and offers the Recluse registration unchecked; the step stores the
  computed answer. Night 2: the Poisoner chooses the Empath, the sheet asks
  for the number with 0, 1 and 2 and nothing pre-selected, the confirm button
  stays disabled until the host answers, and the host's 2 is journaled as
  false information after the step line. Night 3: the host registers the
  Recluse as evil, the step stores 2 and the registration is journaled before
  the step line. Night 4: the Imp kills the Recluse and the count reads the
  next living neighbour. The page had no console error, no failed request and
  no horizontal overflow.
- GREEN: `node scripts/openspec-check.ts` passed (24 specs, 37 active
  changes); `openspec validate --changes --strict` reported 37 passed and
  `--specs --strict` 24 passed.
