# Tasks

## 1. Rules and failing tests

- [x] 1.1 Read the pinned Librarian (r1721), Washerwoman (r2630),
      Investigator (r2983) and Drunk (r3165) text and the three `rule.md`
      files. Rules check: compliant.
- [x] 1.2 Replace the two tests that pinned the old answer ("kept as found,
      not a rule") by tests of the rule in `engine.test.ts`: a zero written
      for the Washerwoman or the Investigator after the night began, a zero
      held for a Drunk shown either role, the command path, and a module stub
      that declares the zero. Run them on main: they fail.
- [x] 1.3 Add a focused check `setup-zero` to `scripts/browser-check.ts` and
      run it on main: it fails.

## 2. Contract and role

- [x] 2.1 Add `orZero?: true` to the `prepared` decision in
      `src/core/roles/ability.ts`, with compile-time checks: `orZero: true` is
      accepted on `prepared`, `orZero: false` and `orZero` on a computed answer
      are rejected, and `zero` is still rejected.
- [x] 2.2 Declare `orZero` in the Librarian's module. Add one module test per
      role: the Librarian declares the zero, the other two do not.

## 3. Engine

- [x] 3.1 `preparedInfo` answers a zero only when the role declares it; a
      zero held for another role returns the missing record.
- [x] 3.2 Add the ruleset version `tb-bmr-snv-2026-11-17`, keep
      `tb-bmr-snv-2026-11-10` and `tb-bmr-snv-2026-11-16` supported, and let a
      command recorded under them keep its answer (`answersZeroForAnyRole`).
      Pass the ports of the command from `completeStep` through `infoForStep`
      to `moduleInfoForStep`.
- [x] 3.3 Add `fixtures/legacy-setup-zero-game.json`, a journal written by
      main `dad24dc`, with an engine test (replay, undo, recorded command
      again, a command sent now) and a store test (load, continue, undo,
      redo). Add one test per older version for a recorded Washerwoman step.

## 4. Screen

- [x] 4.1 Add `zeroShown` to `secrets-options.ts` with a test and use it in
      `secrets.tsx`: a stored zero is shown as the zero for the Librarian
      alone.
- [x] 4.2 Check both screens with real games at 390 px.

## 5. Documents

- [x] 5.1 Update the three rows of `docs/rules-matrix.md` and the three
      `rule.md` files with the new asserting tests, `docs/architecture.md`
      and the slice note in ADR 0002.

## 6. Verification

- [x] 6.1 A seeded driver plays 200 games per edition on main and on this
      change, under the previous ruleset version and under the current one,
      and the games saved by main are replayed on this change.
- [x] 6.2 Mutation checks; replay a part of them through the driver.
- [x] 6.3 `npm run verify` passes on Node 24.
- [x] 6.4 `node --test scripts/*.test.ts` passes.
- [x] 6.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass.
- [x] 6.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- Rules check: compliant. Librarian r1721: "You start knowing that 1 of 2
  players is a particular Outsider. (Or that zero are in play.)" Washerwoman
  r2630: "You start knowing that 1 of 2 players is a particular Townsfolk."
  Investigator r2983: "You start knowing that 1 of 2 players is a particular
  Minion." Only the Librarian's ability has a zero. The setup check already
  refused the record (`info-washerwoman`, `info-investigator`, `drunk-info`).
- RED: Node 24.22.1, main `dad24dc` with the new tests, the fixture and the
  three version constants, and no other change.
  `node --test src/core/engine/engine.test.ts src/application/store/create-game-store.test.ts src/ui/screens/secrets-options.test.ts src/core/roles/librarian/role.test.ts src/core/roles/washerwoman/role.test.ts src/core/roles/investigator/role.test.ts`:
  318 results, 305 passed, 13 failed: 12 tests and one file that does not
  load.
  - Five rule tests: a zero written for the Washerwoman and for the
    Investigator, a zero held for a Drunk shown either, and the command path.
    Observed: `{ kind: "one-of-two", zero: true, text: "В игре нет Изгоев." }`
    where the missing record is expected, and `allowed` where the command
    must ask for setup.
  - The stub test "the zero is written for a module that declares it,
    whatever its id, and its options are not the module's": main wrote the
    zero for a module that declares none.
  - The two tests of a step recorded under an older version and the fixture
    test: the recorded part passes on main, and each fails at the assertion
    about a command or a read of the current version ("a command sent now
    asks for setup": `allowed`; "what the table reads now follows the rule").
  - Three Librarian module tests: the decision of main has no `orZero`.
  - `secrets-options.test.ts` does not load: main has no `zeroShown`.
  - The store test passes on main. It guards the fix and not the defect: it
    fails when recorded commands lose their answer (mutations E4, E6, E7, V2).
- RED: `tsc -p tsconfig.test.json` on the same tree:
  `ability.test-d.ts(217,3): error TS2353 ... 'orZero' does not exist in type`,
  `librarian/role.test.ts(65,56): error TS2339` and
  `secrets-options.test.ts(6,61): error TS2305 ... no exported member 'zeroShown'`.
- RED: `PG_BROWSER_CHECK=setup-zero node scripts/browser-check.ts` on the
  same tree: `AssertionError: a Washerwoman step that holds a zero cannot be
  completed`, `true !== false`. The confirm button of the step was enabled.
- GREEN: the same six test files on this change: 324 tests, 324 passed (the
  file that did not load on main holds 7). `npm test`: 1023 tests, 1023
  passed. `npm run typecheck` passes.
- GREEN: `PG_BROWSER_CHECK=setup-zero node scripts/browser-check.ts` passes.
- GREEN: seeded driver, 200 games per edition through `applyCommand` (not
  committed). For this change it writes a zero for the Washerwoman or the
  Investigator in a quarter of the Trouble Brewing games.
  - Previous version. Every command and every read of the driver under
    `tb-bmr-snv-2026-11-16`: main `dad24dc` and this change give the same 600
    state and result digests and the same 597 counters. In 86 of the games a
    zero held for the Washerwoman or the Investigator reached a step (45
    Washerwoman steps, 53 Investigator steps), and 39 Librarian steps held a
    zero.
  - Saved games. The 600 final states of main were replayed from their
    journals by main and by this change: the two outputs are identical, 585
    replays equal the saved game on both. In the other 15 the driver removed
    a prepared record from the state directly, which no command does; they
    differ or fail the same way on both.
  - Current version. Main with only the version constants against this
    change: 514 games are identical (200 Bad Moon Rising, 200 Sects &
    Violets, 114 Trouble Brewing) and 86 differ, all Trouble Brewing. The 86
    are exactly the games in which such a zero reached a step on main, and
    the first difference in each is that step: 45 times the Washerwoman's, 41
    times the Investigator's, read as a zero on main and as not prepared
    here. On this change no step of either role was answered a zero; 576
    journals replayed to the same state and none of an untouched game
    differed or failed.
- GREEN: mutation checks, each reverted. 22 single changes to
  `information.ts`, `night.ts`, `command-versions.ts`, the three modules and
  `secrets-options.ts` were run against `node --test "src/**/*.test.ts"`: 22
  killed. The count is the number of failing tests.
  - E1 a zero is answered for any role: 9. E2 for no role: 12. E3 the
    declaration is ignored: 8. E4 the version of the command is ignored: 4.
    E5 a zero that is no answer is not a setup question: 9. E6 the
    information path drops the ports: 4. E7 the step completion drops the
    ports: 4. E8 a role that declares no zero is answered one: 16.
  - V1 every version answers a zero for any role: 9. V2 no version does: 4.
    V3 the oldest version loses its answer: 1. V4 the last one before the
    change loses it: 3. V5 the current version is not a new one: 3. V6 the
    last version before the change is no longer supported: 3. V7 a call
    without a version answers a zero for any role: 6. V8 the oldest version
    is no longer supported: 3.
  - M1 the Librarian declares no zero: 10. M2 the Washerwoman declares one:
    8. M3 the Investigator declares one: 6.
  - S1 a stored zero is shown as the zero for any role: 1. S2 never: 1. S3 a
    record without a zero is shown as the zero: 1.
  - Two more outside the unit tests. `orZero?: boolean` in the contract:
    `tsc` reports `ability.test-d.ts(222,3): error TS2578: Unused
    '@ts-expect-error' directive`. `secrets.tsx` with the old test of the
    record: the focused browser check fails at "the Washerwoman's editor
    keeps the character select".
  - Three were also played through the driver. With E1 this change gives the
    600 digests of main with the version constants, so that line is the whole
    difference the driver can see. With E4 and every command under the
    previous version, 86 games differ from main. With M1, 42 Trouble Brewing
    games differ from this change.
- GREEN: `npm run verify` on Node 24.22.1 exited 0: typecheck, oxlint, format
  check, 1023 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles, 28 test files) and
  the ownership ledger.
- GREEN: `node --test scripts/*.test.ts`: 119 passed.
- GREEN: `node scripts/browser-check.ts` passes with the focused check in the
  full run; `node scripts/run-scenarios.ts` reports 10/10 scenarios. The
  focused check reads no text of one language: the first full run failed at
  an assertion on the Russian sentence, because the checks before it leave
  another language selected, and the assertion was replaced by the record the
  table reads and the blocker the sheet names.
- GREEN: seven real Trouble Brewing games at 390 px through the table and the
  secrets screen (a scratch script, not committed). A healthy Washerwoman, a
  poisoned Washerwoman, a healthy Investigator and a Drunk shown the
  Washerwoman, each with a zero sent during the night: the step shows
  "Информация не настроена. Откройте «Секреты».", the confirm button is
  disabled, the sheet names the missing setup, no sentence about Outsiders is
  shown and the zero is not offered. The link opens the secrets screen; the
  editor shows the character and the two players and no zero control, and
  the step completes after the host chooses them. A Librarian with no
  Outsider in play and a Drunk shown the Librarian are as before. The game of
  the fixture loads, shows the recorded answers, continues, and the undo
  button takes the new step back. No page error, no failed request, no
  horizontal overflow.
- GREEN: `node scripts/openspec-check.ts` passes (24 specs, 44 active
  changes); OpenSpec 1.16.1 `validate --changes --strict` passes 44 changes
  and `--specs --strict` 24 specs. The validation notes that this change
  must be archived after `tb-setup-information`.
