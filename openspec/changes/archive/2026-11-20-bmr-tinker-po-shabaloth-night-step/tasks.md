# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Tinker (r1782), Po (r3104) and Shabaloth (r1790)
      text, the Exorcist (r2973) and Goon (r2977) text where they meet
      these steps, the States (r1039) text on a drunk or poisoned ability, the three `rule.md` files and the three matrix rows. Rules
      check: compliant.
- [x] 1.2 Add five characterization tests to `bmr.test.ts` on the untouched
      modules and commit them first. They pin the queue of the first two
      nights with the full record of each step, and the Po's step after a
      night it chose no one. For
      each completion and outcome they also pin the step record, every
      effect with its id and flag, the deaths, the log lines, each draw from
      the command ports and the seat records, for these cases:
      - a Tinker's step with no death, and the host's death on it;
      - a Po who chooses no one, a poisoned Po who chooses no one, a Po kept
        asleep by the Exorcist after a night of no one, and the three
        players of the next night;
      - a Po who chooses one player who dies, and a Po who chooses the Goon;
      - a Shabaloth over three nights: two players, a regurgitation of last
        night's player, a poisoned Shabaloth and one who chooses the Goon,
        with the key order of its record.

## 2. Contract

- [x] 2.1 Add the `record-no-one` intent. The engine writes it as
      `<role>NoOne` on the acting seat, on the `effects` and the
      `suppressed` path.
- [x] 2.2 Add the `record-choices` intent. The engine keeps the record it
      replaces as last night's and writes tonight's, under the acting role
      on the acting seat, in the removed branch's key order, and stores a
      copy of the players.
- [x] 2.3 Add compile-time checks: a role cannot name the role or the seat
      of either record, and cannot write last night's players. Each check
      fails on its own when the field it adds is allowed.

## 3. Roles

- [x] 3.1 Declare the Tinker's step and resolver on an `other` capability;
      the resolver returns `no-effect`.
- [x] 3.2 Declare the Po's step and resolver on an `other` capability; the
      resolver returns `record-no-one`, healthy or impaired.
- [x] 3.3 Declare the Shabaloth's step and resolver on an `other`
      capability; the resolver returns `record-choices` with at most two
      players when it is sober and healthy and the step names players, and
      `no-effect` otherwise.
- [x] 3.4 Remove the three branches from `completeBmrStep`.
- [x] 3.5 Add role tests for the three modules and engine tests for both
      intents, on the working and the failed path.

## 4. Ledger and documents

- [x] 4.1 Regenerate `docs/role-ownership.md` and add a ledger test for the
      three rows.
- [x] 4.2 Update `docs/architecture.md`, the slice 3 note in ADR 0002, the
      three `rule.md` files and three matrix rows.

## 5. Verification

- [x] 5.1 The characterization tests pass unchanged after the move.
- [x] 5.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change, three times; every digest is equal.
- [x] 5.3 Mutation checks.
- [x] 5.4 `npm run verify` passes on Node 24.
- [x] 5.5 `node --test scripts/*.test.ts` passes.
- [x] 5.6 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; the three steps are driven through the table at 390 px on main
      and on this change.
- [x] 5.7 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the role tests fail on main, whose modules declare no capability and
  own no resolver. The Tinker's file reports 2 tests, 0 passed, 2 failed; the
  Po's 3 tests, 0 passed, 3 failed; the Shabaloth's 4 tests, 0 passed, 4
  failed.
- RED: the two new engine tests, run on the engine of main, report 2 tests,
  0 passed, 2 failed: main has neither intent, so it writes no record.
- RED: the ledger test "the Tinker, the Po and the Shabaloth resolve on the
  night-step capability, not in the step completion" fails on main (18
  tests, 17 passed, 1 failed).
- The compile-time checks hold on main as well: there the intents do not
  exist, so the expected errors occur too. They guard the contract from
  here on.
- GREEN: the five characterization tests passed on the untouched modules
  (`bmr.test.ts`: main 146 plus 5). They pass unchanged after the move: the
  diff of `bmr.test.ts` since their commit is empty.
- GREEN: the seeded driver gave the same digest for every game on main
  `9200489` and on this change, the same counters, no replay mismatch and no
  crash. Its Storyteller also marks a Tinker's death on some of the
  Tinker's steps. It ran three times, 600 games each (200 per edition), so
  1,800 games in all:
  - seed 1;
  - seed 2, with bags leaning toward the Tinker, the Po, the Shabaloth, the
    Goon and the Exorcist;
  - seed 3 with the same lean, under the oldest ruleset version
    (`tb-bmr-snv-2026-11-10`).

  A probe counted the Bad Moon Rising games of seeds 1 and 2:
  - The Tinker: 261 steps, 41 of them while drunk or poisoned. 76 Tinkers
    died on their step.
  - The Po: 375 steps. 123 chose no one while healthy and 19 while
    impaired; 52 steps in all were impaired. 111 steps took three players.
    10 Pos chose the Goon. 19 Pos were kept asleep, 5 of them after a night
    of no one. 139 steps had deaths marked by the host.
  - The Shabaloth: 355 steps. 295 recorded their players, 180 of them with
    last night's, and 26 regurgitated a player. 60 recorded nothing: 43 were
    impaired, 8 of them by the Goon, and 17 named no player because the
    Exorcist kept the Shabaloth asleep.

  The probe also counted 9 Tinkers who died on their step while drunk or
  poisoned, the same on both builds: the outcome lets the host mark that
  death, which the `tinkerDeath` command refuses. This change keeps both
  paths as they are.
- GREEN: mutation checks show the proof reads the right facts. Twenty-three
  single changes were made and reverted, and each failed at least one test:
  - the Tinker wakes on the first night (2, among them the printed-order
    test), owns no resolver (1), cannot kill (3) or has another note (2);
  - the Po records the opposite (8), records nothing when impaired (3),
    gets the failure note when impaired (3), wakes on the first night (2)
    or records a choice of the Goon as no one (2);
  - an impaired Shabaloth still records (2), the Shabaloth records every
    player sent (1), records nothing (5), wakes on the first night (2) or
    cannot regurgitate (4);
  - the no-one record is written under a fixed key (1) or not on the
    `suppressed` path (1);
  - the choices record does not keep last night's players (5) or night
    (6), does not write the unset night on the first use (2), writes
    tonight's record before it keeps last night's (2), stores the role's
    list instead of a copy (1), writes tonight's night as last night's (4)
    or is not written on the `suppressed` path (1).
- GREEN: `npm run verify` on Node 24 exited 0. `node --test
  scripts/*.test.ts` passed.
- GREEN: `node scripts/openspec-check.ts` passed, also with the pull
  request body and the changed files of this change.
  `openspec validate --changes --strict` and
  `openspec validate --specs --strict` passed.
- GREEN: `node scripts/browser-check.ts` passed, and
  `node scripts/run-scenarios.ts` passed on the `BASE_PATH=/pocket/` test
  build.
- GREEN: at 390 px, two nine-player Bad Moon Rising games went through the
  table on the test build of main and of this change, one with the Po and
  one with the Shabaloth. The host tapped the players, marked the deaths,
  the Tinker's decision and the regurgitation on the step sheet, and
  confirmed:
  - the Po: no one on night 2; three players and one death on night 3; a
    poisoned Po who chooses no one on night 4; a Po kept asleep by the
    Exorcist on night 5; three players again on night 6, the Goon second,
    and the first player dies;
  - the Tinker: lives on night 2 and dies on night 3;
  - the Shabaloth: two players and one death on night 2; on night 3 it
    regurgitates last night's player and its kill of the Sailor is
    prevented; a poisoned Shabaloth on night 4; the Goon second on night 5,
    and the first player dies.

  Both builds printed the same record: the step sheets, the steps with their
  notes, the seat records, the effects, the deaths and the log lines. Every
  confirm was enabled, no step overflowed the page, and there was no page
  error and no failed request.
