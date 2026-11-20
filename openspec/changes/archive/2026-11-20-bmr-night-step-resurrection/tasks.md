# Tasks

## 1. Rules and failing tests

- [x] 1.1 Read the pinned Professor (r1775), Shabaloth (r1790) and Lunatic
      (r3112) text, the Professor's and the Shabaloth's `rule.md`, the
      `BMR-PROFESSOR-01` and `BMR-SHABALOTH-01` rows and the two
      requirements. Rules check: compliant.
- [x] 1.2 Add tests of the rule: a resurrection refused on the Tinker's step
      alone, beside a death and with a later outcome, and with a later
      outcome on the Po's step (`engine.test.ts`); on the step of a Lunatic
      shown the Shabaloth (`bmr.test.ts`). Run them on main: they fail.
- [x] 1.3 Add a focused check `night-resurrection` to
      `scripts/browser-check.ts` and run it on main: it fails.

## 2. Engine

- [x] 2.1 `recordBmrOutcome` refuses a resurrection on a step whose
      `canResurrect` is not set (`error.51`), before any death or
      resurrection lands.
- [x] 2.2 Add the ruleset version `tb-bmr-snv-2026-11-17.3`, keep the five
      older versions supported, and let a command recorded under them keep
      its resurrection (`resurrectsOnAnyStep`).
- [x] 2.3 Add `fixtures/legacy-night-resurrection-game.json`, a journal
      written by main `f10e1ac`, with an engine test (replay, undo to each of
      the two resurrections, recorded commands against commands sent now), a
      store test (load before the Tinker's step, send the resurrection,
      complete the step without it, undo, redo) and one test per older
      version.

## 3. Documents

- [x] 3.1 Update the `BMR-PROFESSOR-01` and `BMR-SHABALOTH-01` rows of
      `docs/rules-matrix.md` and the two roles' `rule.md` with the new
      asserting tests, `docs/rules-sources.md`, `docs/architecture.md`, the
      note in ADR 0002 and `CHANGELOG.md`.

## 4. Verification

- [x] 4.1 A seeded driver plays games on main and on this change, under
      four previous ruleset versions and under the current one, and the
      games saved by main are replayed on this change.
- [x] 4.2 Mutation checks.
- [x] 4.3 `npm run verify` passes on Node 24.
- [x] 4.4 `node --test scripts/*.test.ts` passes.
- [x] 4.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass.
- [x] 4.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- Rules check: compliant. Professor r1775: "Once per game, at night*,
  choose a dead player: if they are a Townsfolk, they are resurrected."
  Shabaloth r1790: "A dead player you chose last night might be
  regurgitated." No other Bad Moon Rising ability brings a player back, and
  the Lunatic (r3112, "You think you are a Demon, but you are not.") has
  none of the Shabaloth's ability.
- RED: Node 24.22.1, main `f10e1ac` with the new tests, the fixture and the
  version constants, and no other change.
  `node --test src/core/engine/engine.test.ts src/core/engine/bmr.test.ts src/application/store/create-game-store.test.ts`:
  493 tests, 484 passed, 9 failed.
  - "a night step whose ability does not resurrect brings no one back": the
    Gossip's resurrection on the Tinker's step is `allowed`, expected
    `rejected`.
  - "a Lunatic shown the Shabaloth brings no one back on their step": the
    outcome brings the Chambermaid back, expected a refusal.
  - The five tests of a command recorded under an older version: the
    recorded part passes on main, and each fails at `a command sent now is
    refused`.
  - The fixture test: the replay passes on main and the test fails where
    the Tinker's resurrection sent now is `allowed`.
  - The store test: the Tinker's resurrection sent now is `allowed`.
- RED: `PG_BROWSER_CHECK=night-resurrection node scripts/browser-check.ts`
  on main `f10e1ac` with the new check: the engine's preview of a
  resurrection on the Tinker's step is `{ status: 'allowed', errorCode: null }`,
  expected `{ status: 'rejected', errorCode: 'error.51' }`.
- GREEN: the same three files on this change: 493 tests, 493 passed.
  `npm test`: 1139 tests, 1139 passed. `npm run typecheck` passes.
- GREEN: `PG_BROWSER_CHECK=night-resurrection node scripts/browser-check.ts`
  passes: at 390 px, with the Gossip and the Chambermaid killed on night 2,
  the Professor's sheet offers the resurrection, the host picks the Gossip
  and confirms, and the Gossip is alive. The Tinker's sheet then offers no
  resurrection, the engine's preview of one is refused with `error.51`, and
  "The Tinker survives" completes the step with the Chambermaid still dead.
  No horizontal overflow.
- GREEN: seeded driver through `applyCommand` (not committed). On a Bad
  Moon Rising step whose ability does not resurrect, the driver marks a
  dead player's resurrection on 15% of the completions and sends a later
  outcome with one after 5% of the completed steps, and leans on the
  Tinker, the Po, the Professor, the Shabaloth and the Lunatic.
  - Previous versions. Every command under `tb-bmr-snv-2026-11-17.2` (300
    games per edition), `tb-bmr-snv-2026-11-17` and `tb-bmr-snv-2026-11-10`
    (200 each): main `f10e1ac` and this change give the same 2,100 state and
    result digests and the same counters. Their Bad Moon Rising games hold
    1,325 resurrections on a step that cannot resurrect (965 completions,
    360 later outcomes), allowed on both.
  - Current version without those resurrections: main with only the version
    constants against this change, 200 games per edition: 600 of 600
    identical.
  - Saved games. The 600 final states of main (200 per edition) were
    replayed from their journals by main and by this change: the outputs
    are identical, and all 600 replays equal the saved game on both. They
    hold 349 resurrections on a step that cannot resurrect (244
    completions, 105 later outcomes).
  - Current version with those resurrections. Main with only the version
    constants against this change, 300 games per edition: 686 are identical
    and 214 differ, all Bad Moon Rising. In each the first difference is a
    resurrection on a step that cannot resurrect that this change refused
    with `error.51`; main allowed 213 of them and refused one as an
    invariant violation. The new check refused 571 completions and 143
    later outcomes, none on the Professor's or the Shabaloth's step.
- GREEN: mutation checks, each reverted, run against the three test
  files; the count is the number of failing tests.
  - M1 the version is ignored: 6. M3 `tb-bmr-snv-2026-11-17.2` counts as
    fixed: 2. M4 it is dropped from the supported set: 3. M5 only the
    legacy version keeps any-step resurrection: 5. M6, M7, M8 and M9 each
    of `tb-bmr-snv-2026-11-10`, `-11-16`, `-11-17` and `-11-17.1` counts as
    fixed: 1 each.
  - M2 no check: 9, and the browser check. M11 a Lunatic shown the
    Shabaloth gets `canResurrect`: 1. M12 `error.52` instead of `error.51`:
    4. M13 the check refuses on every step: 8, all resurrections by the
    Professor or the Shabaloth.
  - M10 the check names the Professor and the Shabaloth instead of reading
    `canResurrect`: 0. It is equivalent: today `canResurrect` is set on
    exactly those two roles' steps.
  - M14 the step sheet offers a resurrection on every step, M15 on none:
    each fails the browser check.
