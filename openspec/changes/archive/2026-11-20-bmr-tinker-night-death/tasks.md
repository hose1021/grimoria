# Tasks

## 1. Rules and failing tests

- [x] 1.1 Read the pinned Tinker (r1782) and States (r1039) text, the
      Tinker's `rule.md`, the `BMR-TINKER-01` row and the `Tinker death`
      requirement. Rules check: compliant.
- [x] 1.2 Add tests of the rule to `engine.test.ts`: a drunk or poisoned
      Tinker's death refused on the step's completion, on a later outcome and
      by `tinkerDeath` at night and by day; another player's death refused
      alone and beside the Tinker's; the Tinker's own death allowed. Run them
      on main: they fail.
- [x] 1.3 Add a focused check `tinker-night` to `scripts/browser-check.ts`
      and run it on main: it fails.

## 2. Engine

- [x] 2.1 `recordBmrOutcome` refuses, on the Tinker's step, a death of
      another player (`error.51`) and the death of a drunk or poisoned Tinker
      (`error.59`).
- [x] 2.2 Add the ruleset version `tb-bmr-snv-2026-11-17.2`, keep the four
      older versions supported, and let a command recorded under them keep
      its deaths (`marksAnyDeathOnTinkerStep`).
- [x] 2.3 Add `fixtures/legacy-tinker-night-game.json`, a journal written by
      main `e2b8015`, with an engine test (replay, undo to each of the two
      deaths, recorded commands against commands sent now), a store test
      (load before the night 3 step, mark the death, let the Tinker live,
      undo, redo) and one test per older version.

## 3. Documents

- [x] 3.1 Update the `BMR-TINKER-01` row of `docs/rules-matrix.md` and the
      Tinker's `rule.md` with the new asserting tests,
      `docs/rules-sources.md`, `docs/architecture.md`, the note in ADR 0002
      and `CHANGELOG.md`.

## 4. Verification

- [x] 4.1 A seeded driver plays games on main and on this change, under
      three previous ruleset versions and under the current one, and the
      games saved by main are replayed on this change.
- [x] 4.2 Mutation checks.
- [x] 4.3 `npm run verify` passes on Node 24.
- [x] 4.4 `node --test scripts/*.test.ts` passes.
- [x] 4.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass.
- [x] 4.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- Rules check: compliant. Tinker r1782: "At any time, you may decide that
  the Tinker dies." States r1039: "A drunk or poisoned player has no
  ability." The death is the Tinker's ability: a drunk or poisoned Tinker
  does not die from it, and it names no one but the Tinker.
- RED: Node 24.22.1, main `e2b8015` with the new tests, the fixture and the
  version constants, and no other change.
  `node --test src/core/engine/engine.test.ts src/application/store/create-game-store.test.ts`:
  333 tests, 325 passed, 8 failed.
  - "a drunk or poisoned Tinker does not die on their night step, as by
    day": the poisoned Tinker's death is `allowed`, expected `rejected`;
    main records it with `impaired: true`.
  - "only the Tinker dies on the Tinker's step": the Gossip's death on the
    Tinker's step is `allowed`, expected `rejected`.
  - The four tests of a command recorded under an older version: the
    recorded part passes on main, and each fails at `a command sent now is
    refused`.
  - The fixture test: the replay passes on main and the test fails where
    the drunk Tinker's death sent now is `allowed`.
  - The store test: the drunk Tinker's death sent now is `allowed`.
- RED: `PG_BROWSER_CHECK=tinker-night node scripts/browser-check.ts` on main
  `e2b8015` with the new check: the engine's preview of the drunk Tinker's
  death is `{ status: 'allowed', errorCode: null }`, expected
  `{ status: 'rejected', errorCode: 'error.59' }`.
- GREEN: the same two files on this change: 333 tests, 333 passed.
  `npm test`: 1130 tests, 1130 passed. `npm run typecheck` passes.
- GREEN: `PG_BROWSER_CHECK=tinker-night node scripts/browser-check.ts`
  passes: at 390 px the Courtier makes the Tinker drunk on night 2, the host
  picks "dies" on the Tinker's step and confirms; the rejection is shown,
  the sheet stays open, the Tinker is alive and the step open. "Lives"
  completes the step, clears the rejection and moves to the Chambermaid. In
  a second game with a sober Tinker, "dies" kills the Tinker. No horizontal
  overflow.
- GREEN: seeded driver through `applyCommand` (not committed). The driver
  marks the Tinker's death on 40% of the Tinker's steps and another
  player's on 30% of those, and leans on the Tinker, the Pukka, the
  Courtier, the Sailor and the Innkeeper.
  - Previous versions. Every command under `tb-bmr-snv-2026-11-17.1` (300
    games per edition), `tb-bmr-snv-2026-11-17` and `tb-bmr-snv-2026-11-10`
    (200 each): main `e2b8015` and this change give the same 2,100 state and
    result digests and the same counters. In the Bad Moon Rising games both
    allowed 72 completions of the Tinker's step with another player's death
    and 26 while the Tinker was drunk or poisoned.
  - Saved games. The 600 final states of main (200 per edition) were
    replayed from their journals by main and by this change: the outputs
    are identical, and all 600 replays equal the saved game on both. They
    hold 8 Tinker's steps completed with another player's death and 2
    completed with a death while the Tinker was drunk or poisoned.
  - Current version. Main with only the version constants against this
    change, 300 games per edition: 869 are identical and 31 differ, all Bad
    Moon Rising. In each the first difference is a completion of the
    Tinker's step that main allowed and this change refused: 26 with
    `error.51` and 5 with `error.59`.
- GREEN: mutation checks, each reverted, run against the two test files; the
  count is the number of failing tests.
  - M1 the version is ignored: 6. M4 `tb-bmr-snv-2026-11-17.1` counts as
    fixed: 3. M5 it is dropped from the supported set: 3. M8 only the legacy
    version keeps the open step: 5.
  - M2 no impairment check: 7, and the browser check. M3 no check of the
    other players: 2. M6 `error.59` for another player: 2. M7 `error.51` for
    a drunk Tinker: 3, and the browser check.
  - M9 a command without a version counts as recorded: 0. It is equivalent:
    `commandVersion` gives such a command the current version before the
    ports see it.
  - M10 impairment read from `step.impaired`: 0. It is equivalent through
    `completeNightStep`, which writes `step.impaired` from the same check at
    the same moment just before the outcome; it differs only for a later
    `recordBmrOutcome` after the Tinker's impairment changed that night.
