# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Spy (r3118) text, the Poisoner (r1737) and Glossary
      (r3168) text on a poisoned ability, and the Spy's `rule.md`. Rules
      check: compliant.
- [x] 1.2 Add eight characterization tests to `engine.test.ts` on the
      untouched engine: the step as built on three nights; the step and log
      records of a completed step on the first and on the second night with
      the draws from the command ports; an answer of three shapes sent with
      the step; a poisoned Spy; the Spy's own registration and another
      player's; a Spy killed by the Demon; and preview, apply and replay on
      the command path, also with an answer sent.

## 2. Contract

- [x] 2.1 Add the `grimoire` decision to the `information` capability.
- [x] 2.2 Add compile-time checks: a `grimoire` decision cannot carry a value,
      possible values, a text or a mark of impairment.

## 3. Engine

- [x] 3.1 In `moduleInfoForStep`, write the record `{ kind: "grimoire" }` for
      a `grimoire` decision, the same for an impaired owner.
- [x] 3.2 In the gate of `completeStep`, store a Grimoire record and end the
      step without `validateGiven`, so an answer sent with the step is not
      stored.
- [x] 3.3 Cover 3.1 with two engine tests that use a stub module.
- [x] 3.4 Remove the Spy's branch from `infoForStep` and from `completeStep`,
      and the table `infoKindFor`.

## 4. Role

- [x] 4.1 Declare the step of every night with the `grimoire` shape on the
      `night-step` arm and answer through an `information` capability in the
      Spy's module, with three role tests. Remove the legacy `nightStep`.
- [x] 4.2 Update the Spy's `rule.md` and its `docs/rules-matrix.md` row with
      the new implementation text and asserting tests.

## 5. Ledger and documents

- [x] 5.1 Regenerate `docs/role-ownership.md` (the Spy's row declares
      `capability:night-step`, `capability:information` and
      `capability:adjudication` and keeps `day.ts`×1, `setup.ts`×2 and
      `information.ts`×4; the category counts stay 5, 15 and 51) and add a
      test for the row.
- [x] 5.2 Update `docs/architecture.md`, and the slice 2 note, the decision
      table and the information decision sketch in ADR 0002.

## 6. Verification

- [x] 6.1 The characterization tests pass unchanged after the move.
- [x] 6.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change; all 600 state and result digests are equal.
- [x] 6.3 Mutation checks; add a test for each fact they show unpinned.
- [x] 6.4 `npm run verify` passes on Node 24.
- [x] 6.5 `node --test scripts/*.test.ts` passes.
- [x] 6.6 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; the Spy's step is checked at 390 px with real games.
- [x] 6.7 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the three role tests (`node --test
  src/core/roles/spy/role.test.ts`), written before the move with the answer
  still in the engine, reported 3 tests, 0 passed, 3 failed: the module
  declared the empty legacy step where the test expects the `grimoire` shape,
  and owned no answer. The two engine tests of a `grimoire` decision with a
  stub module reported 2 tests, 0 passed, 2 failed: the engine read the
  decision as no answer and recorded `{ kind: "none" }`.
- GREEN: the same role tests report 3 tests, 3 passed after the move, and the
  two stub tests pass.
- GREEN: the eight characterization tests passed on the untouched engine (996
  tests, main 988 plus 8) and pass unchanged after the move; the diff of
  `engine.test.ts` since their commit is 102 added lines and no removed line.
- GREEN: `npm test` reports 1003 tests, 1003 passed, 0 failed.
- GREEN: the seeded driver reported the same digest for 600 games on main
  `034df46` and on this change, and the same counters. 9,707 night step
  commands were sent and 8,478 accepted. The driver sent 366 Spy steps, 171
  on a first night and 195 on a later one. 298 were completed at the first
  attempt, 18 of them for a poisoned Spy. 68 were refused with `error.67` for
  the registration sent with them, 19 of those for a poisoned Spy, and each
  was then completed without it. All 366 stored `{ kind: "grimoire" }`, 37
  with the mark of an impaired owner. An answer was sent with 265 of the
  attempts (96 a Grimoire record with a value and options, 49 a number, 45 a
  character, 28 a yes or no, 24 a bare text, 23 a note) and a null with 20
  more; no step stored any of them. Players were sent with 124 attempts, a
  redirect with 59, the Spy's own registration with 160, another player's
  with 26 and a value that is no registration with 26. 66 more Spy steps
  closed without the Spy: 50 after the Spy died that night and 16 after the
  Spy became the Demon. 562 journals replayed to the same state; in 38 more
  games the driver removed a prepared record of another role from the state
  directly, which no command does, and those games are counted apart, the
  same on both sides.
- GREEN: mutation checks show the proof reads the right facts. Thirty-nine
  single changes were made and reverted, and each fails at least one test.
  Thirty-four of the first thirty-seven failed on the first run. Two passed
  every test and showed facts that no test pinned: a role without an answer
  that is shown the Grimoire, and a redirect sent with the Spy's step that is
  dropped. Two tests were added ("a step of a role that owns no answer has no
  information" and "a redirect sent with the Spy step is journaled as it was
  before the move"); both also pass on the untouched engine of main, and each
  change now fails its test. The thirty-seventh was written wrongly: it read
  the step's impaired mark before the shared end of the step sets it, so it
  changed nothing. It was rewritten to read the effect itself, and two more
  changes of the same kind were added. The counts below are from a run of all
  thirty-nine on the final tests. In the module: no declared shape failed 8
  tests, a number shape 8, a wake on the first night only 5, on the other
  nights only 13, a step that asks for a player 10, no declared step 15, no
  answer 9, a note 10, a number 9, no information capability 11, no answer
  for an impaired owner 3, no registration 5, and a registration as anything
  1. In `information.ts`: a decision that is not read failed 10, a record
  with the impaired flag 9, with a question for an impaired owner 9, with a
  value 9, with the declared shape 1, with options 9, a healthy owner alone
  shown the Grimoire 2, one shared record 1, a role without an answer shown
  the Grimoire 1, the Spy named again by the engine 8, and a note read as the
  Grimoire 2. In `night.ts`: the Grimoire checked like an answer failed 2, a
  step that does not keep the record 7, an answer sent with the step stored
  2, the record stored with an answered mark 7, dropped registrations 1,
  dropped players 1, a dropped redirect 1, a completion gate that does not
  see the capability 103, a step without a declared shape built as a Grimoire
  step 4, every step built without a shape 42, a step finished twice 6, a
  Grimoire step that asks for setup 9, an impaired owner's step that stores
  nothing 1 or is refused 2, and a redirect kept on the step 1.
- GREEN: twenty-two of the changes were also replayed through the seeded
  driver. Twenty-one changed the 600-game digest, in 29 to 200 games: 171
  games for a change that reaches every Spy step, 140 for a Spy that wakes on
  the first night only, 136 for an answer that is stored or checked, 104 for
  dropped registrations, 77 for dropped players, 43 for a dropped or kept
  redirect, 29 for a change that reaches a poisoned Spy only, and 200 for the
  completion gate. The twenty-second, a Grimoire step that asks for setup,
  stopped the driver with an error at a Spy step: the driver repairs a
  request for setup only for the three roles with a prepared answer.
- GREEN: `npm run verify` on Node 24 exited 0: typecheck, oxlint, format
  check, 1003 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles) and the ownership
  ledger.
- GREEN: `node --test scripts/*.test.ts` reports 118 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios.
- GREEN: at 390 px, four seeded games of ten players went through the table
  controls. A healthy Spy on the first night: the step is the last of the
  night, takes no player, the sheet shows "Посмотрите гримуар. Покажите его
  игроку, не комментируя.", asks nothing and offers the button that opens the
  Grimoire; the Grimoire lists the ten players and hiding it returns to the
  open step; the completed step stores `{ kind: "grimoire" }`. A Spy the
  Poisoner chose that night: the same sheet with the warning "Способность
  Шпиона не работает: покажите ложный гримуар.", no question and no
  false-information template; the step stores the same record with the
  impaired mark, and the log holds the step line alone. The same two games on
  the second night, after a first night and a day, gave the same results
  under the key of the second night. The page had no console error, no failed
  request and no horizontal overflow.
- GREEN: `node scripts/openspec-check.ts` passed (24 specs, 42 active
  changes); `openspec validate --changes --strict` reported 42 passed and
  `--specs --strict` 24 passed.
