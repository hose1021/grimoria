# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Imp (r3116), Mayor (r2995), Monk (r3124), Soldier
      (r3121), Scarlet Woman (r3117) and States (r1039) text and the Imp and
      Mayor `rule.md`. Rules check: compliant.
- [x] 1.2 Add thirteen characterization tests to `engine.test.ts` on the
      untouched branch: the step, death and log records and the draw order of
      a kill; the four reasons nobody dies; the redirect question that changes
      nothing; the journaled redirect; the host letting the Mayor die; the
      succession with one and with several living Minions; the win check at
      the end of the step; preview, apply, replay and export on the command
      path; the host choice on the command path.

## 2. Contract

- [x] 2.1 Add the `attack` decision to `AbilityDecision`.
- [x] 2.2 Add compile-time checks: a role cannot name the attacker, the
      redirect or the cause of death.

## 3. Coordinator

- [x] 3.1 Take the host's answers as one object and return an outcome:
      `applied`, `needs-redirect` or `attack`.
- [x] 3.2 Resolve an `attack` decision through `resolveAttack` for the acting
      seat, with nothing written before the call.
- [x] 3.3 Cover 3.1 and 3.2 with two coordinator tests that use a stub module.
- [x] 3.4 Pass the character answer of the Gambler and the Pukka inside the
      answers object in `bmr.ts`.

## 4. Role

- [x] 4.1 Move the Imp choice to `imp/role.ts` as a `night-step` capability
      for every night except the first; remove its branch and the unused
      import from `night.ts`.
- [x] 4.2 Move the attack's step record into `finishAttackStep`, unchanged,
      with the log title taken from the decision.
- [x] 4.3 Update the Imp and Mayor `rule.md` and their `docs/rules-matrix.md`
      rows with the new implementation text and asserting tests.

## 5. Ledger and documents

- [x] 5.1 Regenerate `docs/role-ownership.md` (the Imp row declares
      `capability:night-step` and loses one `night.ts` reference; the summary
      counts do not move) and add a test for the Imp row.
- [x] 5.2 Update `docs/architecture.md` and the slice 2 note and the
      night-step decision cell in ADR 0002.

## 6. Verification

- [x] 6.1 The characterization tests pass unchanged after the move.
- [x] 6.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change; all 600 state and result digests are equal.
- [x] 6.3 `npm run verify` passes on Node 24.
- [x] 6.4 `node --test scripts/*.test.ts` passes.
- [x] 6.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; the Imp step is checked at 390 px with real games.
- [x] 6.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the Imp role test and the lookup test (`node --test` over
  `src/core/roles/imp/role.test.ts` and `src/core/roles/night-step.test.ts`),
  written before the move with the rule still in `night.ts`, reported 16
  tests, 9 passed, 7 failed. Every failure was the Imp module declaring the
  legacy step and no resolver: the engine branch still owned the attack.
- GREEN: the same command reports 16 tests, 16 passed after the move.
- GREEN: the thirteen characterization tests passed on the untouched branch
  (819 tests, main 806 plus 13) and pass unchanged after the move.
- GREEN: `npm test` reports 827 tests, 827 passed, 0 failed.
- GREEN: the seeded driver reported the same digest for 600 games on main
  `bab2258` and on this change. The games completed 8,389 night steps, 490 of
  them Imp attacks: 379 with a death and 111 with none, across all seven
  reasons nobody dies. The driver classified 483 of the attacks: 32 redirected
  deaths and 72 Demon deaths, of which 49 passed the role by rule, 13 asked
  the host for the heir (all answered) and 10 had no heir. The host was asked
  for 58 redirects and answered 52 of them; 43 redirect answers were sent with
  an attack that asked for none. All 600 journals replayed to the same state.
- GREEN: mutation checks show the proof reads the right facts. Another log
  title changed the digest and failed 9 tests; the attack step sent through
  the shared finisher changed the digest and failed 16; a dropped redirect
  answer changed the digest and failed 11; the chosen player as the attacker
  changed the digest and failed 7; a win check before the heir question
  failed 2 tests and changed the 600-game digest; a redirect that is not
  journaled before the attack line changed the digest and failed 3; a step
  time from the system clock changed the digest, broke 30 of 120 replays and
  failed 13; a recorded target on the attack step changed the digest and
  failed 1. Each mutation was reverted.
- GREEN: `npm run verify` on Node 24 exited 0: typecheck, oxlint, format
  check, 827 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles) and the ownership
  ledger.
- GREEN: `node --test scripts/*.test.ts` reports 111 passed.
- GREEN: `node scripts/browser-check.ts` passed and
  `node scripts/run-scenarios.ts` reported 10/10 scenarios, including
  `tb-15-demon-chain`, where the host redirects the attack on the Mayor.
- GREEN: at 390 px, two seeded games went through the table controls. Eight
  players: the Imp has no step on night 1; on night 2 an attack on the player
  the Monk protects kills no one and the attack line is marked as prevented;
  on night 3 an attack on the Mayor shows the redirect question on the step
  sheet, the host's choice dies and the Mayor lives; on night 4 the Imp
  chooses themself, the Poisoner becomes the Imp and the new Demon's wake is
  queued. Ten players: a self-kill with two living Minions shows the heir
  question, and the chosen Spy becomes the Imp. The page had no console
  error, no failed request and no horizontal overflow.
