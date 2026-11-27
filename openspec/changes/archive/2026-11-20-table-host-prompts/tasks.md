# Tasks

## 1. Rules and failing checks

- [x] 1.1 Read the pinned Mayor (r2995), Imp (r3116) and Chef (r2510) text,
      `AGENTS.md` on Storyteller decisions and `app/ui-shell` "Matching
      control state". Rules check: compliant.
- [x] 1.2 Add the focused checks `mayor-redirect`, `heir-question`,
      `heir-sheet` and `chef-label` to `scripts/browser-check.ts`, and have
      `demon-wake` name the heir in the dock. Run them on main: they fail.
- [x] 1.3 Add a unit test of `givenLabelKey` to `helpers.test.ts` and run it
      on main with main's label logic moved into that function: it fails.

## 2. Table

- [x] 2.1 `selectSeat` no longer writes the redirect draft. A new victim
      still drops it.
- [x] 2.2 `TableDock` and `TableRing` treat an owed heir as the night's
      prompt: the dock offers the Minions through `HeirChoice`, the ring's
      centre names the question, and no seat is a target.
- [x] 2.3 `selectSeat` takes no target while the heir is owed, and
      `StepSheet` shows only the question.
- [x] 2.4 `givenLabelKey` names the host's answer by its reason, and
      `GivenSelect` uses it.

## 3. Documents

- [x] 3.1 Cite the new unit test in the `TB-CHEF-02` row of
      `docs/rules-matrix.md` and in `src/core/roles/chef/rule.md`, and add the
      three entries to `CHANGELOG.md`.
- [x] 3.2 The full run's Mayor retarget assertion expects an unanswered
      select after a new victim.

## 4. Verification

- [x] 4.1 Mutation checks.
- [x] 4.2 `npm run verify` passes on Node 24.
- [x] 4.3 `node --test scripts/*.test.ts` passes.
- [x] 4.4 `node scripts/browser-check.ts` and `node scripts/run-scenarios.ts`
      pass.
- [x] 4.5 `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict` / `--specs --strict` pass.

## Evidence

- Rules check: compliant. Mayor r2995: "If you die at night, another player
  might die instead." The Storyteller decides whether and who, so the table
  offers the choice and leaves it unanswered. Imp r3116, "How to Run": "If
  the Imp killed themself at night, choose an alive Minion and replace their
  character token with a spare Imp token [...] Wake the new Imp". The heir
  comes before anything else that night. Chef r2510, Example 4: a player who
  may register either way does so for each pair on its own, so the count the
  Storyteller picks is a registration. `AGENTS.md` forbids auto-filling the
  Mayor redirect and the Demon heir.
- RED: Node 24.22.1, main `205f55c` with the new `scripts/browser-check.ts`
  and no other change.
  - `PG_BROWSER_CHECK=mayor-redirect`: `AssertionError: the dock asks for the
    Mayor's fate`, `0 !== 1`. The seat tap had answered the redirect.
  - `PG_BROWSER_CHECK=heir-question`: the dock names `Гадалка` (the Fortune
    Teller) where the heir question is expected.
  - `PG_BROWSER_CHECK=heir-sheet`: `AssertionError: the open sheet offers
    no step-skip while the heir is unnamed`, `1 !== 0`.
  - `PG_BROWSER_CHECK=chef-label`: `AssertionError: the Chef's count is a
    registration`, the label reads `Ложная информация`.
  - `PG_BROWSER_CHECK=demon-wake`: `TimeoutError` waiting for the heir in the
    dock.
- RED: main `205f55c` with the new `helpers.test.ts` and main's label logic
  moved into `givenLabelKey` unchanged. `node --test
  src/ui/screens/table/helpers.test.ts`: 34 tests, 33 passed, 1 failed, the
  healthy Chef's count gives `falseInfo` where `registration` is expected.
- GREEN: the five focused checks pass on this change: `mayor-redirect`,
  `heir-question`, `heir-sheet`, `chef-label` and `demon-wake`.
  - `mayor-redirect`: at 390 px the Imp's tap on the healthy Mayor leaves the
    redirect select empty, the dock lists it as missing and the confirm is
    disabled; after "the Mayor dies" the step completes and the Mayor dies.
  - `heir-question`: the dock and the centre name the heir question, the dock
    offers the Poisoner and the Scarlet Woman and no complete, skip, reset or
    end of night, no seat is a target, and a seat tap opens that player's
    correction. Naming the Poisoner wakes the new Imp, then the Fortune
    Teller's step opens with no target chosen.
  - `heir-sheet`: a sheet open in the host's window when another window
    records the self-kill offers both Minions and no skip or confirm, and
    names the heir.
- GREEN: `node --test src/ui/screens/table/helpers.test.ts`: 34 tests, 34
  passed.
- GREEN: mutation checks, each reverted alone, run against the checks named:
  11 of 11 killed.
  - M1 a seat tap pre-fills the Mayor redirect again: `mayor-redirect`.
  - M2 the dock ignores the owed heir: `heir-question`, `demon-wake`.
  - M3 the ring's seats ignore the owed heir: `heir-question` (a seat is a
    target of the Fortune Teller).
  - M4 the ring's centre ignores the owed heir: `heir-question`.
  - M5 a seat tap ignores the owed heir: `heir-question` (the tap chooses a
    target instead of opening the correction).
  - M6 the step sheet ignores the owed heir: `heir-sheet`. It survived the
    first round, which had no check of a sheet open when the heir becomes
    owed; `heir-sheet` was added for it.
  - M7 main's label logic: the unit test and `chef-label`.
  - M8 an impaired actor is not false information, M9 a missing source is
    not the Storyteller's answer, M10 a Vortox answer is not false
    information, M11 a missing source outranks an impaired actor: the unit
    test.
- GREEN: `npm run verify` on Node 24.22.1 exited 0: typecheck, oxlint, format
  check, 1072 tests, build, fallback, offline, source policy, official
  provenance (82 entries), acceptance (72 matrix roles, 30 test files),
  version (0.1.0) and the ownership ledger.
- GREEN: `node --test scripts/*.test.ts`: 125 passed.
- GREEN: `node scripts/browser-check.ts` passes with the new checks in the
  full run; `node scripts/run-scenarios.ts` reports 10/10 scenarios on the
  `BASE_PATH=/pocket/` test build.
- GREEN: `node scripts/openspec-check.ts` and OpenSpec 1.16.1
  `validate --changes --strict` and `--specs --strict` pass.
