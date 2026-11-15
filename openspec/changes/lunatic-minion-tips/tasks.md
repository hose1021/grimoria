# Tasks

## 1. Failing checks first

- [x] 1.1 Add the engine test "the Storyteller picks any players as the
  Lunatic's first-night Minions": the step requires one target per Minion, any
  player is accepted, the pick is not an attack, and a wrong count is rejected.
- [x] 1.2 Extend the browser check: pick a Townsfolk as the Lunatic's Minion,
  then assert the card lists that player and neither the real Minion nor the
  real Demon's player.

## 2. Engine

- [x] 2.1 Give the first-night Lunatic step `targetMode: "one-any"` with
  `minTargets = maxTargets =` the Minions in play.
- [x] 2.2 Skip `used.lunaticTarget` and `reportLunaticChoice` on night 1.
- [x] 2.3 Allow the acceptance driver to produce several targets for a
  `one-any` step and accept the legal Mastermind finale.

## 3. UI

- [x] 3.1 Render the picked players in the Lunatic card with the Demon card
  layout; keep the Lunatic's own seat and the bluffs.
- [x] 3.2 Add the first-night guide and role-support copy for the picker.

## 4. Verification

- [x] 4.1 Run `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run format:check` and `npm run build` in the worktree and record the
  results.
- [x] 4.2 Run `node scripts/openspec-check.mjs`,
  `openspec validate --changes --strict` and `openspec validate --specs --strict`.
- [x] 4.3 Verify the card in a real browser at desktop and 390 px: the picked
  player appears, the real Minion and the real Demon's player do not, and the
  console is clean.

## Evidence

- RED: `node --test --test-name-pattern="Storyteller picks any players"
  src/core/engine/bmr.test.ts` -> `AssertionError [ERR_ASSERTION]: one Minion is
  in play` (`actual: 0, expected: 1`) with the picker disabled.
- GREEN: `node --test --test-name-pattern="Lunatic|Minions"
  src/core/engine/bmr.test.ts` -> 7 pass, 0 fail.
- GREEN: `npm test` -> 605 tests, 605 pass.
- GREEN: `npm run typecheck`, `npm run lint` and `npm run format:check` pass;
  `npm run build` completes.
- GREEN: `node scripts/openspec-check.mjs` and
  `openspec validate --changes --strict` pass; `openspec validate --specs
  --strict` passes.
- GREEN browser: the Lunatic step took one target; the card showed `P1 · По`,
  the picked `P3` and the three bluffs; the card never showed `P7` (the real
  Minion) or `P8` (the real Demon). The Demon card kept `P7`. No console errors
  and no horizontal overflow at 390 px.
- GREEN: the full `scripts/browser-check.mjs` passes locally with Playwright
  1.65.0 (`Browser checks passed: phone/tablet, night/day, Virgin, route
  cleanup, privacy, reload, cross-tab, languages, native role sheet, dialog
  contract, offline project-subpath reload, fast PWA update.`), including the
  new Lunatic card assertions.
