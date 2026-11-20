# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Washerwoman (r2630), Librarian (r1721),
      Investigator (r2983) and Drunk (r3165) text and the three `rule.md`
      files. Rules check: compliant.
- [x] 1.2 Add twenty-five characterization tests to `engine.test.ts` on the
      untouched branch: the three steps as built on the first night and not
      on the second; for each role the step and log records of a healthy step
      and the host question of a poisoned owner with its answer as false
      information; the answer read when the step is read; the request for
      setup for an absent, cleared and half-filled record; an answer sent to a
      healthy step; the Librarian's zero, healthy and poisoned; for each role
      a Drunk with its prepared false answer and a Drunk with no record; a
      Drunk shown the Librarian with the zero; a zero written for a
      Washerwoman or an Investigator after the night began; preview, apply
      and replay on the command path with a setup change during the night;
      and three host choices on the command path.

## 2. Contract

- [x] 2.1 Add the `prepared` decision to the `information` capability.
- [x] 2.2 Add compile-time checks: the context exposes no prepared answer, and
      a `prepared` decision cannot carry a character, two players, a zero or
      a mark of missing setup and cannot leave out the possible characters.

## 3. Engine

- [x] 3.1 In `moduleInfoForStep`, write the record of a `prepared` decision
      from the setup record kept under the module's id: the pair, the request
      for setup, the default of a Drunk without a record and the zero.
- [x] 3.2 Cover 3.1 with five engine tests that use a stub module.
- [x] 3.3 Remove the branch of the three roles from `infoForStep`, their
      entries of `infoKindFor` and their names in the gate of `completeStep`.

## 4. Roles

- [x] 4.1 Declare the first-night step with the `one-of-two` shape on the
      `night-step` arm and answer through an `information` capability in the
      three modules, with three tests for each.
- [x] 4.2 Update the three `rule.md` files and their `docs/rules-matrix.md`
      rows with the new implementation text and asserting tests.

## 5. Ledger and documents

- [x] 5.1 Regenerate `docs/role-ownership.md` (the three rows declare
      `capability:night-step` and `capability:information` and keep
      `setup.ts`×3, ×4 and ×2; 5 roles are a capability only, 15 a capability
      with an engine reference and 51 an engine branch) and add a test for the
      rows.
- [x] 5.2 Update `docs/architecture.md`, and the slice 2 note, the decision
      table and the information decision sketch in ADR 0002.

## 6. Verification

- [x] 6.1 The characterization tests pass unchanged after the move.
- [x] 6.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change; all 600 state and result digests are equal.
- [x] 6.3 `npm run verify` passes on Node 24.
- [x] 6.4 `node --test scripts/*.test.ts` passes.
- [x] 6.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; the three steps are checked at 390 px with real games.
- [x] 6.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the three role tests (`node --test` over
  `src/core/roles/washerwoman/role.test.ts`,
  `src/core/roles/librarian/role.test.ts` and
  `src/core/roles/investigator/role.test.ts`), written before the move with
  the answer still in the engine, reported 9 tests, 0 passed, 9 failed. Every
  failure was a module without a `night-step` arm or without an `information`
  capability. The four engine tests of a `prepared` decision with a stub
  module reported 4 tests, 0 passed, 4 failed: the engine did not know the
  decision.
- GREEN: the same role tests report 9 tests, 9 passed after the move, and the
  stub tests pass with a fifth that was added with the move (the module is
  told nothing of what was prepared).
- GREEN: the twenty-five characterization tests passed on the untouched branch
  (974 tests, main 949 plus 25) and pass unchanged after the move; the diff of
  `engine.test.ts` since their commit is 106 added lines and no removed line.
- GREEN: `npm test` reports 988 tests, 988 passed, 0 failed.
- GREEN: the seeded driver reported the same digest for 600 games on main
  `465dd8e` and on this change, and the same counters. 9,623 night step
  commands were sent and 8,464 accepted. The driver sent 475 steps of the
  three roles (163 Washerwoman, 155 Librarian, 157 Investigator): 334 with a
  prepared pair, 63 with a zero (38 for a Librarian, 5 of those impaired; 9
  for a Washerwoman and 16 for an Investigator, written during the night), 69
  without a prepared answer and 9 with the default of a Drunk without a
  record. 52 owners were impaired, 25 of them a Drunk shown the role, and the
  host sent an answer with 213 steps. The host edited the prepared answer 135
  times before the night start and 196 times during the first night (another
  pair, a pair with the real player, a cleared character, a zero, the mark).
  The night start was refused 74 times for an incomplete answer and started
  after a repair each time. All 69 steps without a prepared answer came back
  as a request for setup with `error.44`; in 49 the host then prepared an
  answer and the step completed. On 21 steps that asked the host the driver
  first sent the step without an answer and then with a character that does
  not exist; each attempt came back as a host choice, the second with
  `error.44` for a step without a prepared answer (14) or `error.66` for an
  impaired one (7). 565 journals replayed to the same state;
  in 35 more games the driver removed a prepared record from the state
  directly, which no command does, and those games are counted apart, the
  same on both sides.
- GREEN: mutation checks show the proof reads the right facts. Sixty-two
  single changes were made and reverted. Sixty-one failed at least one test on
  the first run. The sixty-second, the default of a Drunk sharing the list of
  the module, passed every test; one assertion was added to the stub test and
  the change now fails it. In the Washerwoman: every Outsider as possible
  failed 7 tests, every character 6, a wake on every night 2, no declared
  shape 3, a number shape 3, no answer 14, nothing possible 6, every character
  for an impaired owner 7, the last Townsfolk left out 5, and its own
  character left out 5. In the Librarian: every Townsfolk as possible failed
  5, a wake on every night 2, no declared shape 4, no answer 15, nothing
  possible 6, the zero named as possible 6, the Drunk left out 4, and nothing
  possible for an impaired owner 7. In the Investigator: the Demon named too
  failed 6, a wake on every night 2, no declared shape 3, no answer 11,
  nothing possible 6, and every Outsider 6. In the engine: a prepared decision
  that is not read failed 34, every role reading the Washerwoman's record 21,
  every character offered to an impaired owner 9, the possible characters
  offered to a healthy owner 7, no question for an impaired owner 11, a
  question for every owner 9, a record sharing the pair of setup 3, a dropped
  mark 7, a dropped impaired flag 16, another key order 7, a record with one
  player shown 1, a record without a character shown 5, a malformed record
  that is no request for setup 5, the default for a poisoned owner without a
  record 1, a Drunk without a record asked for setup 5, the last possible
  character as the default 5, a false answer that points at the acting seat 8
  or at three players 12, an impaired record sharing the list of the module 1,
  the default with another sentence 5, marked as not prepared 5 or not marked
  impaired 5, the zero with another sentence 4, a healthy zero that asks for
  setup 6, an impaired zero that offers the characters of the module 3, does
  not offer the zero 7, needs no answer 7, is the plain zero 7 or has another
  sentence 6, the zero written for the Librarian alone 2, the record read
  under the role of the step 1, a record without players shown 6, a completion
  gate that does not see the capability 96, a step without a prepared answer
  that completes 2, a step built without the declared shape 35, and a request
  for setup with another code 2 or without its mark 2. Twenty-seven of the
  changes were also replayed through the seeded driver. Twenty-five changed
  the 600-game digest, in 2 to 200 games. Two did not. An impaired zero that
  offers the characters of the module: every impaired zero the driver reached
  was a Librarian's, and its characters are the Outsiders either way; the two
  tests of a zero written for a Washerwoman or an Investigator and a stub test
  cover it. The record read under the role of the step: the id of a real
  module is the role of its step, and a stub test covers it.
- GREEN: `npm run verify` on Node 24 exited 0: typecheck, oxlint, format
  check, 988 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles) and the ownership
  ledger.
- GREEN: `node --test scripts/*.test.ts` reports 117 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios.
- GREEN: at 390 px, eight seeded games went through the table controls.
  Washerwoman with the Chef prepared at seats 3 and 2: the step takes no
  target, the sheet shows "Один из этих игроков — Повар: P3 (3) или P2 (2).",
  asks nothing, and the step stores the character, the two players and the
  mark. Washerwoman poisoned that night: the question is labelled "Ложная
  информация" and offers the thirteen Townsfolk, nothing pre-selected, the
  confirm button disabled until the host answers; the host's Mayor is
  journaled as false information with the two players. Librarian with no
  Outsider in play: the sheet shows "В игре нет Изгоев." and asks nothing.
  That Librarian poisoned: the question offers the four Outsiders and "Нет";
  the host's Saint is stored without the zero and journaled as false
  information, and in a second game the host's "Нет" is stored as the zero
  with the detail "0". Investigator whose prepared character is cleared
  during the night: the sheet shows "Информация не настроена. Откройте
  «Секреты».", the warning with the link to the secrets screen, the blocker
  of setup, and the confirm button stays disabled; after the character is
  prepared again the sheet shows the Poisoner at seats 6 and 4 and the step
  completes. A Drunk shown the Investigator with the Baron prepared as its
  false answer: the question offers the four Minions and the host's Baron is
  journaled as false information. A Drunk shown the Librarian with the zero
  prepared: the question offers the four Outsiders and "Нет". The page had no
  console error, no failed request and no horizontal overflow.
- GREEN: `node scripts/openspec-check.ts` passed (24 specs, 41 active
  changes); `openspec validate --changes --strict` reported 41 passed and
  `--specs --strict` 24 passed.
