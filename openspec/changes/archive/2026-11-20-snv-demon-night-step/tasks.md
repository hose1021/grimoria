# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Fang Gu (r2974), No Dashii (r3158), Vigormortis
      (r3015) and Vortox (r3017) text, the States (r1039) text on a drunk or
      poisoned Demon, the official night sheet, the four `rule.md` files and
      their matrix rows. Each says "Each night except the first, wake" the
      Demon, who points at any player; the Storyteller marks the death, and
      "a poisoned Demon still wakes to attack a player, but nobody dies".
      Rules check: compliant.
- [x] 1.2 Add five characterization tests to `snv.test.ts` on the untouched
      modules and commit them first. They pin, for each of the four Demons:
      - the queue of the first two nights and the full record of the step;
      - the completion: the step record, the effects, the log line, each draw
        from the command ports and the seat's record, and that nobody dies;
      - the host's death on the outcome, with its death record and draws;
      - a poisoned Demon: the same completion, the outcome refused with
        `error.52` and the state unchanged.
      They also pin the step of the Outsider the Fang Gu jumps into, on the
      next night, and a Snake Charmer who becomes the No Dashii on the first
      night, who wakes as it only on the second.

## 2. Roles

- [x] 2.1 Declare each Demon's step and resolver on an `other` capability;
      the resolver returns `no-effect`.
- [x] 2.2 Hand a role that owns a resolver from `completeSvStep` to
      `applyRoleAbility`, after the seat's record is created, and return.
- [x] 2.3 Add a role test for each of the four modules.

## 3. Ledger and documents

- [x] 3.1 Regenerate `docs/role-ownership.md` and add a ledger test for the
      four rows.
- [x] 3.2 Update `docs/architecture.md`, ADR 0002 with the slice 4 note, the
      four Demons' and the Snake Charmer's `rule.md` files and their matrix
      rows.

## 4. Verification

- [x] 4.1 The characterization tests pass unchanged after the move.
- [x] 4.2 A seeded driver plays 200 Sects & Violets games through
      `applyCommand` on main and on this change, three times; every digest is
      equal.
- [x] 4.3 Mutation checks.
- [x] 4.4 `npm run verify` passes (Node 26.13.0 on this machine; CI runs
      Node 24).
- [x] 4.5 `node --test scripts/*.test.ts` passes.
- [x] 4.6 A No Dashii step is driven through the table at 390 px on main
      and on this change.
- [x] 4.7 `node scripts/openspec-check.ts` passes.

## Evidence

- RED: the role tests fail on main, whose modules declare no capability and
  own no resolver: each of the four files reports 2 tests, 0 passed, 2
  failed.
- RED: the ledger test "the four Sects & Violets Demons resolve on the
  night-step capability, not in the step completion" fails on main (19
  tests, 18 passed, 1 failed).
- GREEN: the five characterization tests passed on the untouched modules
  (`snv.test.ts`: main 146 plus 5, 151 passed). They pass unchanged after the
  move: the diff of `snv.test.ts` since their commit is empty.
- GREEN: the seeded driver gave the same digest of the canonical state for
  every game on main `6731b83` and on this change, and the same counters.
  It ran three times, 200 games each:
  - seed 1, any bag;
  - seeds 2 and 3, with bags that add two of the Snake Charmer, the Pit-Hag,
    the Barber, the Philosopher, the Sweetheart and the Cerenovus. Of these
    400, 87 bags did not fit the player count and stopped at setup on both
    builds, so 513 games were played in all.

  Across the three runs the Demons took 1,329 steps, 14 of them while drunk
  or poisoned; the host marked 981 Demon deaths on the outcome, and 12
  deaths marked on a poisoned Demon's step were refused with `error.52`.
- GREEN: mutation checks. Twelve single changes were made and reverted;
  ten failed at least one test:
  - the Fang Gu wakes on the first night (2), owns no resolver (1) or keeps
    a legacy step beside its arm (2);
  - the No Dashii cannot kill (4), kills its target at the completion (4) or
    declares no capability (3);
  - the Vortox chooses nobody (5) or records its choice (3);
  - the Vigormortis's step is optional (3) or its resolver reports a failed
    ability (3).

  Two changes to the new dispatch in `completeSvStep` failed no test: that
  it passes no targets, and that it falls through to the branches below
  instead of returning. Neither is observable while the only resolvers on
  this path return `no-effect` and read no target. The dispatch itself is
  exercised: a resolver that kills or records is caught by the
  characterization tests through it. The next resolver that reads its
  targets or writes on this path will cover both.
- GREEN: `npm run verify` exited 0 on Node 26.13.0, the only Node on this
  machine (1,152 tests passed); Node 24 runs in CI. `node --test
  scripts/*.test.ts` passed (129 tests).
- GREEN: `node scripts/openspec-check.ts` passed. `openspec validate
  --changes --strict` and `--specs --strict` with the CLI version CI pins
  (`@fission-ai/openspec@1.16.1`) passed; this change also passed the
  OpenSpec job of hose1021/grimoria#280.
- GREEN: at 390 px, an eight-player Sects & Violets game with the No Dashii
  was seeded on the second night and driven through the table on the
  development server of main and of this change. The host skipped the
  Cerenovus, tapped P2, opened the step sheet, marked P2's death in the
  night's outcome and confirmed. Both builds printed the same record: the
  step with its note, the death by the No Dashii's ability, the No Dashii's
  two poisons, the seat's record, the last three log lines and the next
  step, the Flowergirl's. The confirm was enabled and the sheet fit the
  page. The one console error on both builds is the offline worker's
  registration: the development server answers `sw.js` with the page,
  because the worker is generated into `dist/` only.
