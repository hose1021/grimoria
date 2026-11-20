# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Chef (r2510), Recluse (r3007), Spy (r3118), Drunk
      (r3165) and States (r1039) text and the Chef `rule.md`. Rules check:
      compliant.
- [x] 1.2 Add twenty characterization tests to `engine.test.ts` on the
      untouched branch: the step as built on the first night only; the count
      around the ring; the step and log records and the draw order of a
      healthy step; an answer sent to a healthy step; the host question of an
      impaired Chef and of a registration range, each changing nothing; the
      host's 7 and 0 as false information; the host's 0, 1 and 2 as a
      registration ambiguity; a registration that moves the computed count and
      not the range; a Spy alone and a Spy with a Recluse; a poisoned Recluse;
      an impaired Chef beside a Recluse; a Drunk shown the Chef; preview,
      apply and replay on the command path; both host choices on the command
      path.

## 2. Contract

- [x] 2.1 Add `legal` to the `answer` decision of the `information`
      capability.
- [x] 2.2 Add `seatIds` and `mayRegisterAs` to the information context.
- [x] 2.3 Add a compile-time check: a role asks about a team, not a character
      type.

## 3. Engine

- [x] 3.1 In `moduleInfoForStep`, ask the host when a working ability names
      more than one legal value and offer a copy of them; keep the possible
      values for an impaired owner.
- [x] 3.2 Supply the two new facts in `informationFacts`.
- [x] 3.3 Cover 3.1 and 3.2 with four engine tests that use a stub module.
- [x] 3.4 Keep `chefCount` as an exported query that resolves the module's
      capability with the engine's facts.
- [x] 3.5 Remove the Chef branch of `infoForStep`, `chefRegistrationRange`,
      the unused `uniqueNumbers`, the Chef entry of `infoKindFor` and its name
      in the gate of `completeStep`.

## 4. Role

- [x] 4.1 Declare the Chef step as a `night-step` capability for the first
      night with the number shape, and answer through an `information`
      capability with the count, the possible answers and the legal range.
- [x] 4.2 Update the Chef `rule.md` and its `docs/rules-matrix.md` rows with
      the new implementation text and asserting tests.

## 5. Ledger and documents

- [x] 5.1 Regenerate `docs/role-ownership.md` (the Chef row declares
      `capability:night-step` and `capability:information` and keeps
      `information.ts`×1; 11 roles are a capability with an engine reference
      and 56 an engine branch) and add a test for the row.
- [x] 5.2 Update `docs/architecture.md`, and the slice 2 note and the
      information decision sketch in ADR 0002.

## 6. Verification

- [x] 6.1 The characterization tests pass unchanged after the move.
- [x] 6.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change; all 600 state and result digests are equal.
- [x] 6.3 `npm run verify` passes on Node 24.
- [x] 6.4 `node --test scripts/*.test.ts` passes.
- [x] 6.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; the Chef step is checked at 390 px with real games.
- [x] 6.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the Chef role test and the lookup test (`node --test` over
  `src/core/roles/chef/role.test.ts` and `src/core/roles/night-step.test.ts`),
  written before the move with the count, the range, the shape and the options
  still in the engine, reported 19 tests, 11 passed, 8 failed. Every failure
  was the Chef module declaring the legacy step and no `information`
  capability.
- GREEN: the same command reports 19 tests, 19 passed after the move.
- GREEN: the twenty characterization tests passed on the untouched branch (889
  tests, main 869 plus 20) and pass unchanged after the move.
- GREEN: `npm test` reports 900 tests, 900 passed, 0 failed.
- GREEN: the seeded driver reported the same digest for 600 games on main
  `d4e5ede` and on this change. 8,215 accepted night step commands completed
  8,204 steps. The driver sent 151 Chef steps: 43 healthy steps with one legal
  count stored the computed count (28 zeros, 13 ones and 2 twos), 16 more
  stored an answer the host sent unasked, 71 steps with a registration range
  stored the host's count (49 with the range 0 to 1, 11 with 0 to 2, 9 with 1
  to 2, 1 with 0 to 3 and 1 with 1 to 3), and 21 impaired steps stored the
  host's number, from 0 to 14. 46 Chef steps were sent with a registration;
  144 completed, and 7 were refused with `error.67` for a registration of a
  drunk or poisoned registrant, the same on both sides. On 23 Chef steps the
  driver first sent the step without an answer and then with a value that was
  not offered; each attempt came back as a host choice, the second with
  `error.66`. All 600 journals replayed to the same state.
- GREEN: mutation checks show the proof reads the right facts. Twenty-eight
  single changes were made and reverted, and each failed at least one test.
  In the role: pairs of good neighbours failed 22 tests, who may be evil
  instead of the registered team 7, no pair across the first seat 13, a pair
  with the seat two away 24, possible answers below the seat count 7,
  possible answers without zero 9, a legal range one past the most 18, a
  legal range from zero 10, the computed count as the only legal value 11,
  one player who may be evil as a pair 18, the fewest pairs ignoring who may
  be good 11, a step on every night 3, no answer shape 25, an answer that
  differs for an impaired owner 5, and no legal range for an impaired owner 1.
  In the engine: a poisoned registrant that may still register failed 2, the
  Spy and the Recluse swapped 11, the host's registration narrowing who may
  register 4, seats without the first one 18, the legal range offered to an
  impaired owner 3, no host question for a registration range 7, one legal
  answer as a host choice 10, a completion gate that does not see the
  capability 42, a step built without the declared shape 19, the query
  without registrations 1, the query off by one 1, the role's own list given
  to the host 1, and the registered team without the host's registrations 6.
  Twelve of the changes were also replayed through the seeded driver, and
  each changed the 600-game digest, in 6 to 171 games.
- GREEN: `npm run verify` on Node 24 exited 0: typecheck, oxlint, format
  check, 900 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles) and the ownership
  ledger.
- GREEN: `node --test scripts/*.test.ts` reports 114 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios.
- GREEN: at 390 px, three seeded games went through the table controls. Game
  1, seven players, the Poisoner beside the Imp: the step takes no target, the
  sheet shows the count 1, asks nothing and offers no registration; the step
  stores the computed answer, and the second night has no Chef step. Game 2,
  the Recluse between the Imp and the Poisoner (Chef r2510, Example 4): the
  sheet asks for the count with 0, 1 and 2 and nothing pre-selected, the
  confirm button stays disabled until the host answers, the Recluse
  registration is offered unchecked; checking it moves the computed count to
  2 and leaves the range and the question; the host's 1 is stored, and the
  journal holds the registration, the step line and the registration
  ambiguity in that order. Game 3, the Poisoner chooses the Chef: the sheet
  asks with 0 to 7 and nothing pre-selected, and the host's 3 is journaled as
  false information after the step line. The page had no console error, no
  failed request and no horizontal overflow.
- GREEN: `node scripts/openspec-check.ts` passed (24 specs, 39 active
  changes); `openspec validate --changes --strict` reported 39 passed and
  `--specs --strict` 24 passed.
