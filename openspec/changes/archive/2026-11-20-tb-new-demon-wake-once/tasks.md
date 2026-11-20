# Tasks

## 1. Rules and failing tests

- [x] 1.1 Read the pinned Imp (r3116) and Scarlet Woman (r3117) "How to Run"
      text and the two `rule.md` files. Rules check: compliant.
- [x] 1.2 Add tests of the rule to `engine.test.ts`: no second wake after a
      completed or skipped wake, the wake queued with the heir choice, the
      Imp's step as the night's last, a succession by day after a night
      change, a Demon who died on an earlier day, and a heir an older ruleset
      left unwoken. Run them on main: they fail, except the last, which guards
      the fix.
- [x] 1.3 Add a focused check `demon-wake` to `scripts/browser-check.ts` and
      run it on main: it fails.

## 2. Engine

- [x] 2.1 `chooseDemonHeir` queues the conditional steps after the heir
      becomes the Demon.
- [x] 2.2 `endDay` carries the Demon-change flag only when last night's queue
      holds no `demonchange` step or a Demon died today.
- [x] 2.3 Add the ruleset version `tb-bmr-snv-2026-11-17.1`, keep the three
      older versions supported, and let a command recorded under them keep
      its wakes (`repeatsDemonWake`).
- [x] 2.4 Add `fixtures/legacy-demon-wake-game.json`, a journal written by
      main `ef55689`, with an engine test (replay, undo to the heir choice and
      to the end of day 2, recorded commands against commands sent now), a
      store test (load at dawn of day 2, end the day, undo, redo) and one test
      per older version.

## 3. Documents

- [x] 3.1 Update the `TB-IMP-01` and `TB-SCARLETWOMAN-02` rows of
      `docs/rules-matrix.md` and the two `rule.md` files with the new
      asserting tests, `docs/rules-sources.md`, `docs/architecture.md`, the
      note in ADR 0002 and `CHANGELOG.md`.

## 4. Verification

- [x] 4.1 A seeded driver plays 200 games per edition on main and on this
      change, under the previous ruleset version and under the current one,
      and the games saved by main are replayed on this change.
- [x] 4.2 Mutation checks.
- [x] 4.3 `npm run verify` passes on Node 24.
- [x] 4.4 `node --test scripts/*.test.ts` passes.
- [x] 4.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass.
- [x] 4.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- Rules check: compliant. Imp r3116, "How to Run": "If the Imp killed
  themself at night, choose an alive Minion and replace their character token
  with a spare Imp token, changing their character to the Imp. Wake the new
  Imp, show them the YOU ARE info token, then show them the Imp token. Put the
  new Imp to sleep." Scarlet Woman r3117: "That night, wake the new Imp, show
  them the YOU ARE info token, then show them the Imp token." One wake, the
  night of the change, after the choice of the Minion.
- RED: Node 24.22.1, main `ef55689` with the new tests, the fixture and the
  version constants, and no other change.
  `node --test src/core/engine/engine.test.ts src/application/store/create-game-store.test.ts`:
  318 tests, 307 passed, 11 failed.
  - "after an Imp self-kill the new Demon is not woken again the next night
    when its wake was completed" and "... was skipped": `no second YOU ARE
    wake the next night`, the night 3 queue holds `n3-3.5-demonchange-all`.
  - "the new Demon's wake is queued as soon as the host names the heir,
    before the next step": the queue after the choice is the poisoner, the
    Imp and the Empath, without `n2-3.5-demonchange-all`.
  - "when the Imp's step was the night's last, the night does not end before
    the named heir is woken": `the wake is queued the same night`.
  - "a Scarlet Woman who takes the role by day after a night self-kill is
    woken the next night, once": no wake after the heir choice
    (`TypeError` reading the key of the missing step).
  - "a Demon who died on an earlier day does not make a later night change
    wake twice": night 3 holds `n3-3.5-demonchange-all`.
  - The three tests of a command recorded under an older version: the
    recorded part passes on main, and each fails at `a command sent now
    queues the wake at once`.
  - The fixture test: the replay passes on main and the test fails at `a
    command sent now does not wake the new Imp again`.
  - The store test: `the new Imp was woken on night 2 and is not woken again`.
  - "a named heir an older ruleset left unwoken is woken on the next night by
    a command sent now" passes on main; it guards the fix and fails under
    mutations M5 and M8.
- RED: `PG_BROWSER_CHECK=demon-wake node scripts/browser-check.ts` on main
  `ef55689` with the new check: `AssertionError: the new Imp is woken next,
  before the Empath`, `'empath:3' !== 'demonchange'`.
- GREEN: the same two files on this change: 318 tests, 318 passed.
  `npm test`: 1066 tests, 1066 passed. `npm run typecheck` passes.
- GREEN: `PG_BROWSER_CHECK=demon-wake node scripts/browser-check.ts` passes:
  at 390 px the host names the Poisoner from the step sheet, the next step is
  the new Imp's wake, the Empath follows, day 2 ends with no execution and
  night 3 opens on the new Imp's own step (Player 8) with no wake. No
  horizontal overflow.
- GREEN: seeded driver, 200 games per edition through `applyCommand` (not
  committed).
  - Previous version. Every command of the driver under
    `tb-bmr-snv-2026-11-17`: main `ef55689` and this change give the same 600
    state and result digests and the same counters.
  - Saved games. The 600 final states of main were replayed from their
    journals by main and by this change: the two outputs are identical, and
    all 600 replays equal the saved game on both. In 66 of them the end of a
    day woke the new Demon again after a night change.
  - Current version. Main with only the version constants against this
    change: 537 games are identical (200 Bad Moon Rising, 200 Sects &
    Violets, 137 Trouble Brewing) and 63 differ, all Trouble Brewing and each
    with a night Demon change. The first difference is the heir choice in the
    12 games in which the host named the heir, and the end of the next day in
    the other 51. The end of day queued a wake 78 times on main and 8 times
    here; the 8 follow a Demon change by day and are the same on main.
- GREEN: mutation checks, each reverted, run against
  `node --test "src/**/*.test.ts"`: 14 of 15 killed. The count is the number
  of failing tests.
  - M1 the version is ignored and every command repeats the wake: 11. M2 no
    recorded command repeats it: 5. M3 `tb-bmr-snv-2026-11-17` counts as
    fixed: 3. M4 the current version is the previous one: 5. M15 the previous
    version is dropped from the supported set: 4.
  - M5 the end of day never carries a change: 3. M6 it always carries one: 9.
    M7 a Demon death today is ignored: 1. M8 last night's queue is ignored: 1.
    M9 any death today counts, not only a Demon's: 1. M10 a death of any
    phase counts: 9. M11 a death of any day counts: 1.
  - M12 the heir choice queues no wake: 7. M13 it queues the wake for recorded
    commands too: 5. M14 it queues the wake after the win check: 0. M14 is
    equivalent: `checkWin` does not read the queue, so the order of the two
    calls is not observable.
- GREEN: `npm run verify` on Node 24.22.1 exited 0: typecheck, oxlint, format
  check, 1066 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles, 30 test files), version
  (0.1.0) and the ownership ledger.
- GREEN: `node --test scripts/*.test.ts`: 125 passed.
- GREEN: `node scripts/browser-check.ts` passes with the focused check in the
  full run; `node scripts/run-scenarios.ts` reports 10/10 scenarios on the
  `BASE_PATH=/pocket/` test build.
- GREEN: `node scripts/openspec-check.ts` and OpenSpec 1.16.1
  `validate --changes --strict` and `--specs --strict` pass.
