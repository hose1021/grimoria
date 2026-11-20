# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Sailor (r1768), Innkeeper (r3160) and Goon (r2977)
      text, the States (r1039) text on a drunk or poisoned ability, the two
      `rule.md` files and the three matrix rows. Rules check: compliant.
- [x] 1.2 Add five characterization tests to `bmr.test.ts` on the untouched
      modules and commit them first. They pin the queue of two nights with
      the full record of both steps. For each completion they also pin the
      step record, every effect with its id and flag, the log lines and each
      draw from the command ports, for these cases:
      - a Sailor on the first and the second night, the second choosing
        themself;
      - an Innkeeper on the second and the third night;
      - a Sailor poisoned on the first night;
      - a Sailor and an Innkeeper poisoned after a working night;
      - a Sailor and an Innkeeper who choose the Goon.

## 2. Contract

- [x] 2.1 Add `drunkId` to the ability context and to the host's answers;
      `completeBmrStep` passes the step's answer.
- [x] 2.2 Add the `drunk` and `safe` kinds to `timed-effect`. Store `safe`
      as the Innkeeper's protection; the marker and its reader share
      `SAFE_EFFECT` in `effects.ts`.
- [x] 2.3 Add `endsOnUse` to the `night-step` arm and `nightArmFor` to the
      lookup. The coordinator ends the named kinds before it builds the
      context.
- [x] 2.4 Add `givenBy` to `effects.ts` and use it for `endsOnUse` and
      `replacesPrevious`.
- [x] 2.5 Add compile-time checks: the drunk answer is read-only, and an arm
      cannot end a kind the engine does not date.

## 3. Roles

- [x] 3.1 Declare the Sailor's step and resolver on a `night-step`
      capability for every night, ending its drunk effects on each use.
- [x] 3.2 Declare the Innkeeper's step and resolver on a `night-step`
      capability for the nights after the first, ending its safety and its
      drunk effects on each use.
- [x] 3.3 Remove both branches from `completeBmrStep`.
- [x] 3.4 Add role tests for both modules and engine tests for the order of
      the ending, the Goon's effect and the storage of the two kinds.

## 4. Ledger and documents

- [x] 4.1 Regenerate `docs/role-ownership.md` and add a ledger test for the
      two rows.
- [x] 4.2 Update `docs/architecture.md`, the slice 3 note in ADR 0002, the
      two `rule.md` files and the three matrix rows.

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

- RED: the role tests fail on main. The two files do not load there,
  because the lookup of main has no `nightArmFor`. With that import removed,
  the Sailor's file reports 4 tests, 0 passed, 4 failed: the module of main
  declares no capability, so it owns no resolver.
- RED: the new engine tests, run on the engine of main, report 3 tests, 1
  passed and 2 failed:
  - "a night step ends the effects its arm names before the resolver reads
    the owner's health": main ends nothing, so the resolver sees a drunk
    owner;
  - "the safe and drunk dated effects are stored as the Innkeeper's
    protection and a drunk effect": main passes no drunk answer.

  The test that keeps the Goon's effect passes on main, because main ends
  nothing.
- RED: the ledger test "the Sailor and the Innkeeper resolve on the
  night-step capability, not in the step completion" fails on main (16
  tests, 15 passed, 1 failed).
- The two compile-time checks hold on main as well: there the fields do not
  exist, so the expected errors occur too. They guard the contract from
  here on.
- GREEN: the five characterization tests passed on the untouched modules
  (1077 tests: main 1072 plus 5). They pass unchanged after the move: the
  diff of `bmr.test.ts` since their commit is empty, and its diff against
  main is 827 added lines and no removed line.
- GREEN: `npm test` reports 1088 tests, 1088 passed, 0 failed.
  `node --test scripts/*.test.ts` reports 126 passed.
- GREEN: the seeded driver gave the same digest for every game on main
  `569080d` and on this change, the same counters, no replay mismatch and no
  crash. It ran three times, 600 games each (200 per edition), so 1,800
  games in all:
  - seed 1;
  - seed 2, with bags leaning toward the Sailor, the Innkeeper and the Goon;
  - seed 3 with the same lean, under the oldest ruleset version
    (`tb-bmr-snv-2026-11-10`).

  A probe counted the Bad Moon Rising games of seeds 1 and 2:
  - The Sailor: 756 steps, 166 on a first night and 590 on a later one. 679
    worked and 77 failed, 39 of the failures because the Sailor chose the
    Goon. 434 Sailors made themselves drunk. 577 steps ended an earlier
    choice, 64 of them while the ability failed.
  - The Innkeeper: 681 steps, all on later nights. 583 worked and 98
    failed, 43 of the failures because the Innkeeper chose the Goon. 59
    Innkeepers made themselves drunk. 464 steps ended an earlier choice, 63
    of them while the ability failed.
- GREEN: mutation checks show the proof reads the right facts. Eighteen
  single changes were made and reverted, and each failed at least one test:
  - the Sailor's arm ends nothing (4 tests);
  - the Innkeeper ends no safety (3) or no drunkenness (3);
  - nothing ends (5);
  - the ending runs after the resolver reads the owner's health (1, the
    engine test; in a game an ended effect has already expired, so the
    order changes only the contract);
  - the Goon's effect ends too (4);
  - every kind of the owner's effect ends (1);
  - an impaired Sailor (4) or Innkeeper (4) still works;
  - the Sailor's drunkenness ends a night early (6);
  - the Innkeeper's safety lasts until dusk (4);
  - the safety is stored without its marker (6, among them the Innkeeper's
    protection from the Pukka's death);
  - the drunk answer is not passed (7);
  - the Innkeeper acts on fewer than two players (1);
  - the Sailor skips the first night (17);
  - the Innkeeper wakes on the first night (2, among them the printed-order
    test);
  - the Innkeeper's drunkenness is written before its safety (3);
  - the Sailor ignores the host's drunk answer (5).
- GREEN: `npm run verify` on Node 24.22.1 exited 0: typecheck, oxlint,
  format check, 1088 tests, build, fallback, offline, source policy,
  official provenance (82 entries), acceptance (72 matrix roles, 32 test
  files), version (0.1.0) and the ownership ledger.
- GREEN: at 390 px, one eight-player Bad Moon Rising game went through the
  table on the test build of main and of this change. The host tapped the
  players, opened the step sheet, named the drunk player and confirmed:
  - night 1: the Sailor makes another player drunk;
  - night 2: the Sailor makes themself drunk, and the Innkeeper protects two
    players and makes one drunk;
  - night 3: a poisoned Sailor, and an Innkeeper who chooses the Goon;
  - night 4: the Innkeeper chooses themself.

  Both builds kept the same effects, flags, log lines and notes, and the
  sheet offered the same drunk choices. No step overflowed the page, and
  there was no page error and no failed request.
