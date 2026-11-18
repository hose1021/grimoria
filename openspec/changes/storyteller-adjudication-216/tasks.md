# Tasks

## 1. Evidence

- [x] 1.1 Read Dreamer r2904, Sage r3009 and Pacifist r2601 from the pinned
      local snapshots.
- [x] 1.2 Inventory every mechanically significant host decision with its rule
      ID, validation, effect, journal and asserting test (`design.md`).
- [x] 1.3 Record RED for the pair control before the engine change.

- RED: `node --test --test-name-pattern="Dreamer pair|Dreamer offers|impaired Dreamer|Sage offers|impaired Sage|Pacifist survival" src/core/engine/snv.test.ts src/core/engine/engine.test.ts` failed: the Dreamer and Sage returned `note` with no options, and no `pacifist-survival` line existed.
- GREEN: the same command passed 12 of 12 after the engine change; `npm test`
  reported 1263 pass.

## 2. Dreamer and Sage pair control

- [x] 2.1 The Dreamer offers only a true character plus an opposite-kind
      character, any pair while impaired, and no true-character pair under a
      Vortox.
- [x] 2.2 The Sage offers pairs with exactly one Demon while sober, any pair
      while impaired, and no Demon pair under a Vortox.
- [x] 2.3 `givenIsLegal` validates both pair kinds; a rejected pair changes
      nothing.
- [x] 2.4 The shown pair is a secret `information-pair` journal choice with
      role ids or seat names.
- [x] 2.5 Preview, apply, replay, undo, export and import keep the pair.
- [x] 2.6 The public projection never contains the pair.

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
      control and tests.
- [x] 5.2 `src/core/roles/dreamer/rule.md` and `sage/rule.md` cite the tests.
- [x] 5.3 `CHANGELOG.md` carries the change under Unreleased.

## 6. Verification

- [x] 6.1 `npm run verify` passed: typecheck, lint, format, 1263 tests, build,
      fallback, offline, type policy, provenance, acceptance, version and the
      ownership ledger.
- [x] 6.2 `npx openspec validate storyteller-adjudication-216 --type change
      --strict` passed.
- [x] 6.3 Browser check on the real dev server: the pair select rendered at
      390 x 844 and 1440 x 900; the shown pair and the journal line read in
      RU, EN and AZ.

## Evidence

- The saved `pg.game.v4` after confirming the Dreamer step holds
  `given.pair = ["clockmaker", "fanggu"]` and a secret
  `information-pair` line `clockmaker / fanggu`.
- The journal title read `Показана пара.`, `A pair was shown.` and
  `Cüt göstərildi.` in the three locales; the detail named
  `Clockmaker / Fang Gu`.
