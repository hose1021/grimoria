# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Imp (r3116) and Po (r3104) text, the matrix rows
      and both `rule.md` files. The Imp "each night* chooses a player: they
      die"; the Po "may choose a player" and a night with no choice charges
      three targets. Rules check: compliant.
- [x] 1.2 Record the RED commands: the two new tests fail against the base
      `skipStep`, which accepts the skip.
- [x] 1.3 Name the allowed skips from the existing role steps: the Assassin,
      the Barber, the Courtier, the Philosopher, the Professor and the
      Seamstress declare `optional`; system steps and dead actors stay
      skippable.

## 2. Engine

- [x] 2.1 Add `canSkipStep` and refuse a living actor's mandatory step in
      `skipStep` with `error.80` before any mutation.
- [x] 2.2 Version the rule: `tb-bmr-snv-2026-11-19` is the first version
      that refuses it; a journal recorded under an earlier version keeps its
      skip and still replays.
- [x] 2.3 Keep the Po's zero-target confirmation on its existing path, which
      writes `used.poNoOne`.

## 3. Screens

- [x] 3.1 Carry `skippable` from `canSkipStep` in `tableProjection`.
- [x] 3.2 Render the dock and step-sheet Skip controls only when it is true,
      and replace them with the named No one action on a Po step that accepts
      zero targets, with a hint that the next night takes three.
- [x] 3.3 Add the Russian, English and Azerbaijani `error.80` and No one copy.

## 4. Tests

- [x] 4.1 Add the Imp test: the skip is refused, the state, the journal and
      the queue stay, and the attack still completes.
- [x] 4.2 Add the Po test: the skip is refused, the explicit No one action
      records `used.poNoOne`, the next step takes exactly three targets.
- [x] 4.2a Add the direct role matrix: the current ruleset refuses the
      Exorcist and Pukka skips and allows the optional Professor, Assassin and
      dead Barber skips, without a legacy ruleset version.
- [x] 4.3 Keep the fixture skips that advance a test night on the recorded
      ruleset version, so their journals and log ids stay the same.
- [x] 4.4 Add the focused browser check `mandatory-skip`.

## 5. Documents

- [x] 5.1 Cite the new tests in the Imp and Po `rule.md` dossiers.
- [x] 5.2 Regenerate nothing else: no schema, command payload or role row
      changes.

## 6. Verification

- [x] 6.1 `npm test` passes.
- [x] 6.2 `PG_BROWSER_CHECK=mandatory-skip node scripts/browser-check.ts`
      passes, and `step-action` and `demon-wake` still pass.
- [x] 6.3 `npm run verify` passes.
- [x] 6.4 `openspec validate --changes --strict` and
      `node scripts/openspec-check.ts` pass.

## Evidence

- RED: with the guard disabled, `node --test --test-name-pattern="a living
  Imp's mandatory|the Po's no-one is a recorded"` reports 2 tests, 0 passed,
  2 failed. The Imp skip returned `ok: true` and the Po skip reported
  `allowed` without recording `poNoOne`.
- GREEN: the same command reports 2 tests, 2 passed.
- GREEN: `npm test` reports 1,275 tests, all passed.
- GREEN: `PG_BROWSER_CHECK=mandatory-skip` passes; the dock has no Skip on the
  Imp step, the sheet has no skip, the command is rejected with `error.80`, the
  Po step shows the named No one action with its hint in the dock and the
  sheet, the action stores `used.poNoOne`, and the next Po step reports
  `min: 3, max: 3`.
- GREEN: the direct role matrix passes at the current ruleset: the Exorcist and
  Pukka skips are refused with `error.80` and the state stays, while the
  optional Professor, Assassin and dead Barber skips are recorded.
- GREEN: legacy fixtures keep their skips under the recorded ruleset version,
  so the replay, preview and journal tests pass unchanged.
- GREEN: `npm run verify` and the strict OpenSpec checks pass.
