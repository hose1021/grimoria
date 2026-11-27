# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Cerenovus (r3048) text, the Vigormortis (r3015)
      text on a killed Minion's ability, the official night sheet, the
      `rule.md` file and the matrix row. "Each night, wake the Cerenovus.
      They point at any player and at any Townsfolk or Outsider icon";
      "During the next day or night" the Storyteller may execute the mad
      player. Rules check: compliant.
- [x] 1.2 Add five characterization tests to `snv.test.ts` on the untouched
      module and commit them first. They pin the step on the first and the
      second night with the good characters to choose; the token, the
      note, the log line, the draws and the seat's record of a choice, and
      a second night's token beside the first; a choice without a
      character; an evil character refused through `applyCommand` with the
      state unchanged; a poisoned Cerenovus; and a Cerenovus the
      Vigormortis killed, who still wakes.

## 2. Contract

- [x] 2.1 Add the `madness` intent. The engine writes the token with the id
      of the ability, the seat, the player and the night, in the stored key
      order, keeps a copy of the end, and writes nothing on the
      `suppressed` path.
- [x] 2.2 Add compile-time checks: a role cannot name the token id, the
      owning ability, the source or whether the token applies.

## 3. Role

- [x] 3.1 Declare the Cerenovus's step and resolver on an `any` capability.
- [x] 3.2 Keep the good-character check in `completeSvStep`, before the
      step is handed to the coordinator, and remove the branch.
- [x] 3.3 Add a role test for the module and an engine test for the
      intent, on the working and the failed path.

## 4. Ledger and documents

- [x] 4.1 Regenerate `docs/role-ownership.md` and add a ledger test for the
      row.
- [x] 4.2 Update `docs/architecture.md`, the slice 4 note in ADR 0002, the
      `rule.md` file and the matrix row.

## 5. Verification

- [x] 5.1 The characterization tests pass unchanged after the move.
- [x] 5.2 A seeded driver plays Sects & Violets games through
      `applyCommand` on main and on this change; every digest is equal.
- [x] 5.3 Mutation checks.
- [x] 5.4 `npm run verify` passes (Node 26.13.0 on this machine; CI runs
      Node 24).
- [x] 5.5 `node --test scripts/*.test.ts` passes.
- [x] 5.6 A Cerenovus step is driven through the table at 390 px on main
      and on this change.
- [x] 5.7 `node scripts/openspec-check.ts` passes.

## Evidence

- RED: on the base of this change (`refactor/snv-demon-night-step`) the
  role test reports 3 tests, 1 passed, 2 failed: the module declares its
  step in the legacy field, which the shape test reads as well, and owns no
  resolver. The engine test of the intent reports 1 test, 0 passed, 1
  failed: the base has no such intent and writes no token. The ledger test
  "the Cerenovus resolves on the night-step capability, not in the step
  completion" fails (20 tests, 19 passed, 1 failed).
- The compile-time checks hold on the base as well, where the intent does
  not exist. They guard the contract from here on.
- GREEN: the five characterization tests passed on the untouched module
  (`snv.test.ts`: 151 plus 5, 156 passed). They pass unchanged after the
  move: the diff of `snv.test.ts` since their commit is empty.
- GREEN: the seeded driver gave the same digest of the canonical state for
  every game on main `6731b83` and on this change, and the same counters.
  It now also names an evil character on 8% of the steps that offer
  characters. Five runs, 1,200 games, of which 787 set up and were played:
  seed 11 with any bag; seeds 12 to 15 with bags that lean toward the
  Cerenovus with the Vigormortis, the Philosopher or the Sweetheart. The
  Cerenovus took 1,833 steps, 4 of them drunk or poisoned and 37 by a dead
  Cerenovus; 1,340 madness tokens were written; 255 completions naming an
  evil character were refused with `error.2`.
- GREEN: mutation checks. Eleven single changes were made and reverted;
  each failed at least one test:
  - the Cerenovus skips the first night (22), owns no resolver (15), makes
    a player mad for a day more (4), still makes a player mad when impaired
    (2), gets the failure note when impaired (2) or names the character by
    its id in the note (2);
  - the token's id lacks the night (3), the token is kept on the failed
    path (1), its keys are written in another order (1) or it keeps the
    role's end instead of a copy (1);
  - an evil character is no longer refused (3).
- GREEN: `npm run verify` exited 0 on Node 26.13.0, the only Node on this
  machine (1,161 tests passed); Node 24 runs in CI. `node --test
  scripts/*.test.ts` passed (130 tests).
- GREEN: at 390 px, an eight-player Sects & Violets game with the
  Cerenovus and the No Dashii was seeded on the first night, after the
  Minion and Demon information, and driven through the table on the
  development server of main and of this change. The host tapped P2,
  opened the step sheet, chose the Artist in the character list and
  confirmed. Both builds printed the same record (equal hashes): the step
  with its note and stored answer, the madness token with its id, the No
  Dashii's two poisons, the seat's record, the last two log lines and the
  next step, the Clockmaker's. The confirm was enabled. On both builds the
  step sheet's content is 10 px wider than the sheet at this width (376
  against 366), so its right edge is cut; the page does not scroll
  sideways. That predates this change, which touches no screen. The only
  console error on both builds is the offline worker's registration on the
  development server.
- GREEN: `node scripts/openspec-check.ts` passed. `openspec validate
  --changes --strict` and `--specs --strict` with the CLI version CI pins
  (`@fission-ai/openspec@1.16.1`) passed after the requirements longer than
  500 characters were split; upstream CI had reported them on
  hose1021/grimoria#280.
