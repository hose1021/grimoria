# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Devil's Advocate (r2594) and Exorcist (r2973)
      text, the Shabaloth (r1790), Pukka (r3074) and Goon (r2977) text, the
      States (r1039) text on a drunk or poisoned ability, the two `rule.md`
      files and the five matrix rows. Rules check: compliant.
- [x] 1.2 Add six characterization tests to `bmr.test.ts` on the untouched
      modules and commit them first. They pin the queue of two nights with
      the full record of both steps and the step of the third night. For
      each completion they also pin the step record, every effect with its
      id and flag, the log lines, each draw from the command ports, the
      choice record and the Demon's step, for these cases:
      - a Devil's Advocate on the first and the second night;
      - a Devil's Advocate poisoned after two working nights, then one who
        chooses the Goon;
      - an Exorcist who chooses a player who is not the Demon;
      - an Exorcist who chooses the Po, a poisoned Exorcist who chooses
        the Po and an Exorcist who chooses the Goon;
      - an Exorcist who chooses the Shabaloth, and one who chooses the Pukka
        with a waiting death.

## 2. Contract

- [x] 2.1 Add the `record-choice` intent. The engine writes it under the
      acting role's own record, on the `effects` and the `suppressed` path.
- [x] 2.2 Add the `survives-execution` kind to `timed-effect`, stored as
      the Devil's Advocate's protection with its day; the stored shape and
      the execution check share `SURVIVES_EXECUTION_EFFECT` in
      `effects.ts`.
- [x] 2.3 Add the `block-demon` intent and `keepDemonAsleep` in `bmr.ts`;
      `applyEffect` receives the step for the Pukka's report.
- [x] 2.4 Add compile-time checks: a role cannot name the record or the
      seat of its choice, and a block names its note and cannot change the
      Demon's step.

## 3. Roles

- [x] 3.1 Declare the Devil's Advocate's step and resolver on a `first` and
      an `other` capability, ending its protection on each use.
- [x] 3.2 Declare the Exorcist's step and resolver on an `other`
      capability.
- [x] 3.3 Remove both branches from `completeBmrStep`.
- [x] 3.4 Add role tests for both modules, engine tests for the storage of
      the new kind and the choice record, and a test for the block with a
      module of its own.

## 4. Ledger and documents

- [x] 4.1 Regenerate `docs/role-ownership.md` and add a ledger test for the
      two rows.
- [x] 4.2 Update `docs/architecture.md`, the slice 3 note in ADR 0002, the
      two `rule.md` files and four matrix rows.

## 5. Verification

- [x] 5.1 The characterization tests pass unchanged after the move.
- [x] 5.2 A seeded driver plays 200 games per edition through `applyCommand`
      on main and on this change, three times; every digest is equal.
- [x] 5.3 Mutation checks.
- [x] 5.4 `npm run verify` passes on Node 24.
- [x] 5.5 `node --test scripts/*.test.ts` passes.
- [x] 5.6 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass; both steps are driven through the table at 390 px on main and on
      this change.
- [x] 5.7 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- RED: the role tests fail on main. The Devil's Advocate's file reports 4
  tests, 0 passed, 4 failed, and the Exorcist's 5 tests, 0 passed, 5 failed:
  the modules of main declare no capability, so they own no resolver.
- RED: the new engine tests, run on the engine of main, report 2 tests, 0
  passed, 2 failed:
  - "the survives-execution dated effect is stored as the Devil's
    Advocate's protection for the next day": main stores the kind under its
    own name, without a day;
  - "the record of tonight's choice names the module's role and is written
    also when the ability fails": main writes no record.
- RED: in `bmr.test.ts` on main, 146 tests, 145 passed and 1 failed: "a
  Demon kept asleep gets the note the role wrote, and a Demon whose step is
  finished only the log line". The six characterization tests pass there.
- RED: the ledger test "the Devil's Advocate and the Exorcist resolve on
  the night-step capability, not in the step completion" fails on main (17
  tests, 16 passed, 1 failed).
- The four compile-time checks hold on main as well: there the intents do
  not exist, so the expected errors occur too. They guard the contract from
  here on.
- GREEN: the six characterization tests passed on the untouched modules
  (`bmr.test.ts`: main 139 plus 6). They pass unchanged after the move: the
  diff of `bmr.test.ts` since their commit adds the block test and its two
  imports and removes no line.
- GREEN: the seeded driver gave the same digest for every game on main
  `3f8a907` and on this change, the same counters, no replay mismatch and no
  crash. It ran three times, 600 games each (200 per edition), so 1,800
  games in all:
  - seed 1;
  - seed 2, with bags leaning toward the Devil's Advocate, the Exorcist,
    the Goon, the Po, the Pukka and the Shabaloth;
  - seed 3 with the same lean, under the oldest ruleset version
    (`tb-bmr-snv-2026-11-10`).

  A probe counted the Bad Moon Rising games of seeds 1 and 2:
  - The Devil's Advocate: 734 steps, 165 on a first night and 569 on a
    later one. 632 worked and 102 failed, 33 of the failures because it
    chose the Goon. 120 chose themself. 549 steps ended an earlier
    protection, 80 of them while the ability failed. 568 steps barred last
    night's choice. 10 protected players were executed and stayed alive.
  - The Exorcist: 578 steps, all on later nights. 502 worked and 76 failed,
    17 of the failures because it chose the Goon. 424 steps barred last
    night's choice. 80 chose the Demon, 7 of them while the ability failed;
    the other 73 kept the Demon asleep: 20 Po, 25 Pukka, 14 Shabaloth and
    14 Zombuul. 9 blocks of the Pukka resolved its waiting death.

  The probe also counted 5 protected players who died when executed, the
  same on both builds. Each had a reason the protection did not hold: the
  Devil's Advocate was poisoned or had died, or the player was already dead.
- GREEN: mutation checks show the proof reads the right facts. Twenty-five
  single changes were made and reverted, and each failed at least one test:
  - the Devil's Advocate ends nothing on the first night (1) or on later
    nights (5);
  - an impaired Devil's Advocate still protects (4), records nothing (3) or
    keeps a wasted protection (3);
  - the protection ends at dawn instead of the next night (7);
  - the first-night note on every night (2);
  - the protection is stored without its day (7), with the day after the
    expiry (1, the engine test of the key order), with the day taken from
    the expiry (7) or under its own kind (7);
  - nobody chosen keeps the night of the record (1);
  - the choice is not recorded on the `suppressed` path (5);
  - the Exorcist wakes on the first night (2, among them the printed-order
    test);
  - the Exorcist blocks any player (2);
  - an impaired Exorcist still blocks (3) or records nothing (4);
  - the Exorcist records no empty choice (1);
  - the Shabaloth loses its regurgitation (2);
  - the Pukka's waiting death does not resolve (2) or is not reported on the
    step (1);
  - a finished Demon step is written again (1);
  - no log line for a block (3);
  - the block's note loses the Exorcist's name (4);
  - the block is applied before the choice is recorded (3).
- GREEN: `npm run verify` on Node 24.22.1 exited 0: typecheck, oxlint,
  format check, 1106 tests, build, fallback, offline, source policy,
  official provenance (82 entries), acceptance (72 matrix roles, 34 test
  files), version (0.1.0) and the ownership ledger.
  `node --test scripts/*.test.ts` reports 127 passed.
- GREEN: `node scripts/openspec-check.ts` passed (25 specs, 51 active
  changes), also with the pull request body and the changed files of this
  change. `openspec validate --changes --strict` passed 51 of 51 and
  `openspec validate --specs --strict` 25 of 25.
- GREEN: `node scripts/browser-check.ts` passed, and
  `node scripts/run-scenarios.ts` passed 10 of 10 on the `BASE_PATH=/pocket/`
  test build.
- GREEN: at 390 px, one eight-player Bad Moon Rising game went through the
  table on the test build of main and of this change. The host tapped the
  player and confirmed the step:
  - night 1: the Devil's Advocate protects a player;
  - night 2: the Devil's Advocate protects another, and the Exorcist
    chooses a player who is not the Demon;
  - night 3: the Exorcist chooses the Po, whose step closes with the
    Exorcist's note;
  - night 4: a poisoned Devil's Advocate, and an Exorcist who chooses the
    Goon;
  - night 5: a poisoned Exorcist chooses the Po, who still wakes.

  Both builds printed the same record: the choice records, the effects
  with their flags, the Po's step, the log lines, the text of each step
  sheet, and last night's choice shown as unavailable on the table each
  night. No step overflowed the page, and there was no page error and no
  failed request.
