# Tasks

## 1. Rules and failing tests

- [x] 1.1 Read the pinned Goon (r2977) and Pukka (r3074) "How to Run" text,
      the two `rule.md` files and SYS-EFFECTS-04. Rules check: compliant.
- [x] 1.2 Add a Bad Moon Rising test of the choice to `bmr.test.ts` and three
      graph tests to `commands.test.ts`. Run them on main: they fail with
      `CYCLIC_EFFECT_DEPENDENCY`.
- [x] 1.3 Add a focused check `pukka-goon` to `scripts/browser-check.ts` and
      run it on main: it fails.

## 2. Engine

- [x] 2.1 `topological` gives a permanent effect no incoming edge
      (`dependsOnSource`).
- [x] 2.2 The Vigormortis poison keeps its incoming edges, with a test that a
      cycle through its dead Minion is still rejected.
- [x] 2.3 Add a test that a permanent effect holds in either visiting order.

## 3. Documents

- [x] 3.1 Update the `SYS-EFFECTS-04`, `BMR-GOON-01`, `BMR-PUKKA-07` and
      `SNV-VIGORMORTIS-02` rows of `docs/rules-matrix.md`,
      `docs/rules-shared.md`, the three `rule.md` files,
      `docs/rules-sources.md` and `CHANGELOG.md`.

## 4. Verification

- [x] 4.1 A seeded driver plays 200 games per edition on main and on this
      change, and the games saved by main are replayed on this change.
- [x] 4.2 Mutation checks.
- [x] 4.3 `npm run verify` passes on Node 24.
- [x] 4.4 `node --test scripts/*.test.ts` passes.
- [x] 4.5 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass.
- [x] 4.6 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- Rules check: compliant. Goon r2977, "How to Run": "The Goon still changes
  alignment, and makes the player drunk, if the player choosing the Goon was
  already drunk or poisoned." Pukka r3074: "If the Pukka was sober when they
  chose a player the previous night, but is drunk at night, that player does
  not die. But when the Pukka sobers up, the poison resumes and kills the
  player at night." A Pukka poisoned by its own poison is such a chooser, and
  the state it leads to resolves, so SYS-EFFECTS-04 does not refuse it.
- RED: Node 24.22.1, main `d383d53` with the new tests and no other change.
  `node --test src/core/engine/commands.test.ts src/core/engine/bmr.test.ts`:
  190 tests, 186 passed, 4 failed.
  - "a Pukka poisoned by its own poison can choose a sober Goon: it is drunk
    until dusk and the Goon turns evil": the preview is rejected with
    `CYCLIC_EFFECT_DEPENDENCY` over `eff-goon-3-2` and
    `eff-pukka-poison-1-2`.
  - "a permanent effect on its own source resolves beside that source's own
    poison": `CYCLIC_EFFECT_DEPENDENCY` over `goon-drunk` and `self-poison`.
  - "a same-night pair of a player's effects on themself is still a cycle
    unless one is permanent": the cyclic half passes, the permanent half fails
    over `pair-drunk` and `pair-poison`.
  - "a Vigormortis poison still waits for its dead Minion": the rejection
    passes, the other permanent poison fails over `minion-poison` and
    `neighbour-poison`.
  - "a permanent effect holds while its source is already poisoned, in either
    visiting order" passes on main. It guards the fix and fails under M6.
- RED: `PG_BROWSER_CHECK=pukka-goon node scripts/browser-check.ts` on main
  `d383d53` with the new check: `AssertionError: the preview of the choice
  names no rejection`, `1 !== 0`.
- GREEN: the same two files on this change: 190 tests, 190 passed.
  `npm test`: 1071 tests, 1071 passed.
- GREEN: `PG_BROWSER_CHECK=pukka-goon node scripts/browser-check.ts` passes.
  At 390 px night 3 opens on the Pukka's step with the Pukka poisoned by its
  own poison; choosing the Goon shows no rejection, the step completes, the
  Goon is evil, one Goon drunk is stored and the night moves to the
  Professor's step. No horizontal overflow.
- GREEN: seeded driver, 200 games per edition through `applyCommand` (not
  committed), main `d383d53` against this change.
  - Trouble Brewing: 200 of 200 games identical.
  - Sects & Violets, leaning toward the Snake Charmer and the Vigormortis (30
    Snake Charmer and 6 Vigormortis poisons in the final states): 200 of 200
    identical.
  - Bad Moon Rising, leaning toward the Pukka and the Goon: 193 identical and
    7 differ. The 7 are exactly the games in which main refused a step as a
    cycle (18 refusals). In each the first difference is the night of main's
    first refusal, where this change records the Pukka choosing the Goon.
  - Saved games: the 600 final states of main were replayed from their
    journals by main and by this change. The outputs are identical and all
    600 replays equal the saved game.
  - No ruleset version: main instrumented to count the cycles the graph met
    inside each command saw 18 cycles, all in refused commands, and none in
    an allowed one.
- GREEN: mutation checks, each reverted, run against
  `node --test "src/**/*.test.ts"`: 7 of 7 killed. The count is the number of
  failing tests.
  - M1 every effect waits for its source (the fix reverted): 4.
  - M2 no effect waits for its source: 12.
  - M3 the Vigormortis poison waits for nothing: 1.
  - M4 only permanent effects wait: 14.
  - M5 only the Vigormortis poison waits: 12.
  - M6 a permanent effect is lost when its source is impaired: 1. It
    survives on main, where no test reached a permanent effect after the
    poison on its source.
  - M7 the Goon's drunk is not permanent: 1.
- GREEN: `npm run verify` on Node 24.22.1 exited 0: typecheck, oxlint, format
  check, 1071 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles, 30 test files), version
  (0.1.0) and the ownership ledger.
- GREEN: `node --test scripts/*.test.ts`: 125 passed.
- GREEN: `node scripts/browser-check.ts` passes with the focused check in the
  full run; `node scripts/run-scenarios.ts` reports 10/10 scenarios on the
  `BASE_PATH=/pocket/` test build.
- GREEN: `node scripts/openspec-check.ts` and OpenSpec 1.16.1
  `validate --changes --strict` and `--specs --strict` pass.
