# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Clockmaker (r2967), Dreamer (r2904), Evil Twin
      (r3101), Flowergirl (r2907), Mathematician (r3153), Oracle (r2909) and
      Town Crier (r3145) text and the official night sheet. Each "How to
      Run" names the nights the role wakes, and the sheet agrees. Rules
      check: compliant.
- [x] 1.2 Add four characterization tests to `snv.test.ts` on the untouched
      modules and commit them first. They pin the queue of the first two
      nights with each step's record; what each completion stores (the
      answer, the shared note, one log line, the draws, no effect) and the
      Mathematician's cleared ledger; a Philosopher who gains the Oracle or
      the Clockmaker on the second night, or the Flowergirl on the first;
      and a Pit-Hag who makes a Town Crier or a Clockmaker on the second
      night.

## 2. Roles

- [x] 2.1 Declare the seven steps on `night-step` arms with the timing of
      the pinned text and the shape of the legacy fields, without a
      resolver.
- [x] 2.2 Add a role test for each module: the step on each night, the arm's
      timing, and no resolver yet.

## 3. Ledger and documents

- [x] 3.1 Regenerate `docs/role-ownership.md` and add a ledger test for the
      seven rows.
- [x] 3.2 Update `docs/architecture.md`, the slice 4 note in ADR 0002, the
      seven `rule.md` files and their matrix rows.

## 4. Verification

- [x] 4.1 The characterization tests pass unchanged after the move.
- [x] 4.2 A seeded driver plays Sects & Violets games through
      `applyCommand` on main and on this change; every digest is equal.
- [x] 4.3 Mutation checks.
- [x] 4.4 `npm run verify` passes (Node 26.13.0 on this machine; CI runs
      Node 24).
- [x] 4.5 `node --test scripts/*.test.ts` passes.
- [x] 4.6 A Clockmaker and a Dreamer step are driven through the table at
      390 px on main and on this change.
- [x] 4.7 `node scripts/openspec-check.ts` passes.

## Evidence

- RED: on the base of this change (`refactor/snv-cerenovus-night-step`)
  each of the seven role tests reports 1 test, 0 passed, 1 failed: the
  modules declare legacy fields and no arm, so the arm's timing is absent.
  The ledger test "the Sects & Violets information roles declare their step
  on the night-step capability and keep their answers in the engine" fails
  (21 tests, 20 passed, 1 failed).
- GREEN: the four characterization tests passed on the untouched modules
  (`snv.test.ts`: 156 plus 4, 160 passed). They pass unchanged after the
  move: the diff of `snv.test.ts` since their commit is empty.
- GREEN: the seeded driver gave the same digest of the canonical state for
  every game on main `6731b83` and on this change, and the same counters.
  Three runs, 800 games, of which 794 set up and were played: seed 21 with
  any bag; seeds 22 and 23 with bags that lean toward the Philosopher, the
  Pit-Hag and the seven roles. The seven roles took 5,190 steps, 470 of
  them drunk or poisoned; 304 were a Philosopher's borrowed ability and 80
  were taken by a player whose character had changed.
- GREEN: mutation checks. Eleven single changes were made and reverted;
  each failed at least one test:
  - the Clockmaker wakes every night (2) or on the later nights only (15);
    the Evil Twin wakes on the later nights only (5);
  - the Dreamer chooses nobody (4) or skips the first night (5);
  - the Mathematician has no answer (5), or owns a resolver that does
    nothing, which skips the cleared ledger (4);
  - the Flowergirl wakes on the first night only (12); the Town Crier
    answers a number (4);
  - the Oracle wakes every night (2) or keeps a legacy step beside its arm
    (2).

  The two changes to "every night" fail only the role tests: the
  sequence of the later nights has no slot for the Clockmaker and the
  first-night sequence none for the Oracle, so no queue changes.
- GREEN: `npm run verify` exited 0 on Node 26.13.0, the only Node on this
  machine (1,172 tests passed); Node 24 runs in CI. `node --test
  scripts/*.test.ts` passed (131 tests).
- GREEN: at 390 px, a ten-player Sects & Violets game with the seven roles,
  a Philosopher, the Pit-Hag and the Vigormortis was seeded on the first
  night and driven through the table on the development server of main and
  of this change. The host opened the Clockmaker's step sheet, which showed
  the computed distance (1), and confirmed; then tapped P5 for the Dreamer,
  opened the sheet and confirmed. Both builds printed the same record
  (equal hashes of the queue, the effects and the log), and the next step
  was the Mathematician's. The confirm was enabled on both sheets.
- GREEN: `node scripts/openspec-check.ts` passed. `openspec validate
  --changes --strict` and `--specs --strict` with the CLI version CI pins
  (`@fission-ai/openspec@1.16.1`) passed after the requirements longer than
  500 characters were split; upstream CI had reported them on
  hose1021/grimoria#280.
