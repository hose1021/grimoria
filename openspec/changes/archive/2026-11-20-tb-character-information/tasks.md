# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Undertaker (r3115), Ravenkeeper (r3125), Recluse
      (r3007), Spy (r3118), Drunk (r3165) and States (r1039) text and both
      `rule.md` files. Rules check: compliant.
- [x] 1.2 Add thirty characterization tests to `engine.test.ts` on the
      untouched branch. For each role: the step as built and when it is not
      built; the step and log records and the draw order of a healthy step; an
      answer sent to a healthy step; the host question of an impaired owner
      and its answers as false information; a Recluse and a Spy as the
      subject; a poisoned Recluse; a Drunk shown the role; preview, apply and
      replay on the command path; both host choices on the command path. For
      the Undertaker also the day it reads, a refused character registration,
      an executed Drunk and the note of a step without a death on record. For
      the Ravenkeeper also the question before a player is chosen and the
      choice of any player.

## 2. Contract

- [x] 2.1 Add `subjectId` to the `answer` decision and the `note` decision to
      the `information` capability.
- [x] 2.2 Add `executedToday` and `mayRegisterAsCharacters` to the
      information context.
- [x] 2.3 Add compile-time checks: the context exposes no death records and
      no cause of the execution, a role cannot rewrite who was executed or
      write the record's own field for the player, and a note carries no
      answer and cannot require the host.

## 3. Engine

- [x] 3.1 In `moduleInfoForStep`, write the character record for a step that
      declares the `character` shape: the character, the subject, and a copy
      of the legal characters for a working ability or of the possible ones
      for an impaired owner.
- [x] 3.2 Store a note as the answer of the step, and keep the question with
      every character for a character step without an answer.
- [x] 3.3 Supply the two new facts in `informationFacts`.
- [x] 3.4 Cover 3.1 to 3.3 with seven engine tests that use a stub module.
- [x] 3.5 Remove the Undertaker and Ravenkeeper branches of `infoForStep`,
      their entries of `infoKindFor` and their branches of `completeStep`.

## 4. Roles

- [x] 4.1 Answer through an `information` capability in both modules and
      declare the `character` shape in the legacy step that holds the wake.
- [x] 4.2 Update both `rule.md` files and their `docs/rules-matrix.md` rows
      with the new implementation text and asserting tests.

## 5. Ledger and documents

- [x] 5.1 Regenerate `docs/role-ownership.md` (the Undertaker row declares
      `nightStep` and `capability:information` with no engine reference; the
      Ravenkeeper row declares the same and keeps `night.ts`×4; 5 roles are a
      capability only, 12 a capability with an engine reference and 54 an
      engine branch) and add a test for each row.
- [x] 5.2 Update `docs/architecture.md`, and the slice 2 note and the
      information decision sketch in ADR 0002.

## 6. Verification

- [x] 6.1 The characterization tests pass unchanged after the move.
- [x] 6.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change; all 600 state and result digests are equal.
- [x] 6.3 `npm run verify` passes on Node 24.
- [x] 6.4 `node --test scripts/*.test.ts` passes.
- [x] 6.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; both steps are checked at 390 px with real games.
- [x] 6.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the two role tests and the lookup test (`node --test` over
  `src/core/roles/undertaker/role.test.ts`,
  `src/core/roles/ravenkeeper/role.test.ts` and
  `src/core/roles/night-step.test.ts`), written before the move with both
  answers still in the engine, reported 24 tests, 12 passed, 12 failed. Every
  failure was a module without an `information` capability or without the
  declared character shape.
- GREEN: the same command reports 24 tests, 24 passed after the move.
- GREEN: the thirty characterization tests passed on the untouched branch (930
  tests, main 900 plus 30) and pass unchanged after the move; the diff of
  `engine.test.ts` since their commit is 250 added lines and no removed line.
- GREEN: `npm test` reports 949 tests, 949 passed, 0 failed.
- GREEN: the seeded driver reported the same digest for 600 games on main
  `a93fb16` and on this change. 8,163 accepted night step commands completed
  8,152 steps. The driver sent 187 Undertaker steps, every one about a dead
  player: 56 healthy steps stored the computed character, 56 more stored an
  answer the host sent unasked (29 of those a character drawn from the whole
  catalog), 46 steps with a registration stored the host's character (23
  about a Spy with 18 characters offered, 23 about a Recluse with 6), and 29
  impaired steps stored the host's character, 9 of them for a Drunk shown the
  Undertaker. 184 completed, and 3 were refused with `error.67` for a
  registration sent with the step, the same on both sides. It sent 78
  Ravenkeeper steps, all completed: 25 healthy with the computed character, 18
  healthy with an answer sent unasked, 26 with a registration (12 about a Spy,
  14 about a Recluse) and 9 impaired, 3 of them for a Drunk shown the
  Ravenkeeper; 17 chose a dead player, 8 of those its own seat. On 19
  steps of the two roles the driver first sent the step without an answer and
  then with a character that was not offered; each attempt came back as a host
  choice, the second with `error.66`. All 600 journals replayed to the same
  state.
- GREEN: mutation checks show the proof reads the right facts. Forty-nine
  single changes were made and reverted. Forty-eight failed at least one test.
  In the Undertaker: the seat's character instead of the one on record failed
  4 tests, no subject 13, the legal characters as the possible ones 7, the
  recorded character as the only legal one 6, every character as legal 13, no
  note 2, another note text 2, an answer that differs for an impaired owner 4,
  no legal characters for an impaired owner 1, no declared shape 21, a wake
  without an execution 1, an answer for a death record without a character 1,
  and the legal characters of its own seat 12. In the Ravenkeeper: the second
  chosen player failed 17, no subject 14, the legal characters as the possible
  ones 6, the real character as the only legal one 4, every character as legal
  11, an answer that differs for an impaired owner 4, no legal characters for
  an impaired owner 1, a target that cannot be its own seat 7, no declared
  shape 16, an answer for a seat that does not exist 2, a note in place of the
  question 2, and its own character 15. In the engine: the execution of a day
  that has not come failed 19, no execution fact 19, the owner's poisoning
  widening the characters 1, the legal characters offered to an impaired owner
  10, the possible ones offered to a healthy owner 20, one legal character as
  a host choice 15, no host question for a registration 8, a record without
  the player 25, without the impaired flag 29, one character not listed 13, a
  note without its text 2, no question for a character step without an answer
  2, that question needing no answer 2, the catalog itself given to the host
  1, the role's own lists given to the host 2, a character recorded as a plain
  value 29, a poisoned registrant that still registers 3, a Recluse and a Spy
  without registrations 6 and 3, a Recluse shown as a Townsfolk 6, the
  question given to every shape 1, a completion gate that does not see the
  capability 71, and a step built without the declared shape 30. One change
  survived and is equivalent: the Ravenkeeper's wake without the check that
  the player is dead, because a living player has no time of death; the wake
  is not part of this move. Twenty of the changes were also replayed through
  the seeded driver. Nineteen changed the 600-game digest, in 1 to 177 games.
  The missing note did not: no driven game has an Undertaker step without a
  death on record, and the two tests above cover it.
- GREEN: `npm run verify` on Node 24 exited 0: typecheck, oxlint, format
  check, 949 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles) and the ownership
  ledger.
- GREEN: `node --test scripts/*.test.ts` reports 116 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios.
- GREEN: at 390 px, seven seeded games went through the table controls.
  Undertaker, the Chef executed: the step takes no target, the sheet shows
  "P2 — Повар.", asks nothing, and the step stores the character with the
  player. Undertaker, the Recluse executed (a registration as in r3115,
  Example 3):
  the sheet asks under the label "Регистрация" with the Recluse and the five
  evil characters, nothing pre-selected, the confirm button disabled until the
  host answers; the host's Imp is journaled as a registration ambiguity after
  the step line. Undertaker poisoned that night: the question is labelled
  "Ложная информация" and offers all 22 characters; the host's Mayor is
  journaled as false information. A day without an execution: the second
  night has no Undertaker step. Ravenkeeper killed by the Imp: the step
  appears after the Imp's, the sheet says the player died tonight; with no
  player chosen it shows "Сначала выберите цель.", offers no character and
  cannot be confirmed; with the Chef chosen it shows "P2 — Повар." and asks
  nothing. Ravenkeeper choosing the Recluse (r3125, Example 2): the
  registration question with six characters, the host's Scarlet Woman
  journaled as a registration ambiguity. Ravenkeeper poisoned and then killed,
  choosing the Imp: the false-information question with all 22 characters,
  the host's Saint journaled as false information. The page had no console
  error, no failed request and no horizontal overflow.
- GREEN: `node scripts/openspec-check.ts` passed (24 specs, 40 active
  changes); `openspec validate --changes --strict` reported 40 passed and
  `--specs --strict` 24 passed.
