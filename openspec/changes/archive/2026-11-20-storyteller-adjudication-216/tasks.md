# Tasks

## 1. Evidence

- [x] 1.1 Read Dreamer r2904, Sage r3009, Spy r3118, Recluse r3007, Vortox
      r3017 and Pacifist r2601 from the pinned local snapshots.
- [x] 1.2 Inventory every mechanically significant host decision with its rule
      ID, validation, effect, journal and asserting test (`design.md`).
- [x] 1.3 Record RED for the pair control before the engine change.
- [x] 1.4 Record RED for the released-journal replay before the version gate.

- RED: `node --test --test-name-pattern="Dreamer pair|Dreamer offers|impaired Dreamer|Sage offers|impaired Sage|Pacifist survival" src/core/engine/snv.test.ts src/core/engine/engine.test.ts` failed: the Dreamer and Sage returned `note` with no options, and no `pacifist-survival` line existed.
- GREEN: the same command passed 12 of 12 after the engine change; `npm test`
  reported 1263 pass.
- RED (history): with `requiresInfoPair` forced to the pre-PR behavior, the
  focused run of the 0.4.1 fixture and the two old-version command tests failed
  with `requires-storyteller-choice` instead of `allowed`.
- GREEN (history): the same focused run passed after the version gate and the
  fixture replay; `npm test` reported 1269 pass.

## 2. Dreamer and Sage pair control

- [x] 2.1 The Dreamer offers only a true character or a legal registered
      character plus an opposite-kind character, any pair while impaired, and no
      raw-character pair under a Vortox.
- [x] 2.2 The Sage offers pairs with the Demon who killed the Sage, any pair
      while impaired, and no killer pair under a Vortox.
- [x] 2.3 `givenIsLegal` validates both pair kinds; a rejected pair changes
      nothing.
- [x] 2.4 The shown pair is a secret `information-pair` journal choice with
      role ids or seat names.
- [x] 2.5 The supported character pool is not narrowed by a custom script, and
      an empty list refuses every answer.
- [x] 2.6 Preview, apply, replay, undo, export and import keep the pair.

## 3. Audit follow-ups

- [x] 3.1 A Pacifist survival writes a secret choice line and keeps the
      execution line.
- [x] 3.2 Host-choice journal titles resolve in RU, EN and AZ.

## 4. UI

- [x] 4.1 The step card renders a pair select with localized role or player
      names.
- [x] 4.2 The chosen pair renders in the step summary and the dialog.
- [x] 4.3 RU, EN and AZ render at 390 px and desktop width.

## 5. Evidence surfaces

- [x] 5.1 `docs/rules-matrix.md` Dreamer, Sage and Pacifist rows cite the new
      control, the killer and the tests.
- [x] 5.2 `src/core/roles/dreamer/rule.md` and `sage/rule.md` cite the tests.
- [x] 5.3 `CHANGELOG.md` carries the change under Unreleased.

## 6. Verification

- [x] 6.1 `npm run verify` passed.
- [x] 6.2 `npx openspec validate storyteller-adjudication-216 --type change
      --strict` passed.
- [x] 6.3 Browser check on the real dev server at 390 x 844 and 1440 x 900 in
      RU, EN and AZ.

## 7. Review fixes

- [x] 7.1 Add `INFO_PAIR_RULESET_VERSION` and keep the released
      `tb-bmr-snv-2026-11-17.4` supported.
- [x] 7.2 Keep the 0.4.1 free-text note answer only for recorded older
      versions; a current command requires the pair.
- [x] 7.3 Generate `fixtures/legacy-dreamer-sage-game.json` from the released
      0.4.1 engine and prove import, export, replay, undo and continuation.
- [x] 7.4 Record the attacking Demon on the death and read it for the Sage; a
      death without the field falls back to the current Demon.
- [x] 7.5 Allow a legal Spy/Recluse registered character, ignore a custom
      script's role subset, and refuse an empty pair list.
- [x] 7.6 Gate the `attackerId` field by version so old journals replay without
      extra death fields.
- [x] 7.7 Assert the pair content in the Vortox and Sage browser scenarios.

## Evidence

- The saved `pg.game.v4` after confirming the Dreamer step holds
  `given.pair = ["clockmaker", "fanggu"]` and a secret
  `information-pair` line `clockmaker / fanggu`.
- The journal title read `Показана пара.`, `A pair was shown.` and
  `Cüt göstərildi.` in the three locales; the detail named
  `Clockmaker / Fang Gu`.
- The fixture `legacy-dreamer-sage-game.json` holds 15 commands recorded under
  `tb-bmr-snv-2026-11-17.4`, including a sober Dreamer and a sober Sage without
  a pair; import, export, replay, undo and a current `endNight` all succeed.
