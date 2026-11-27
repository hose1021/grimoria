# Tasks

## 1. Source and contract

- [x] 1.1 Read `Artist.r3156`, `Savant.r2910`, `Vortox.r3017` and
  `Professor.r1775`; record the answer set, the once-per-game/day frequency, the
  impaired exception and the Vortox false-information rule.
- [x] 1.2 Extend `GameState`, `Used` and the command payload schema with the
  optional `artist` and `savant` records and the `artistQuestion` and
  `savantVisit` commands.

## 2. Behavior

- [x] 2.1 Add the `dayAbilityHolder` guard, `artistQuestion`, `savantTruthChoices`
  and `savantVisit` to `day.ts`; export them through the engine barrel.
- [x] 2.2 Register both commands in `commands.ts`, keeping the one
  validate/preview/apply path, journaling and idempotency.
- [x] 2.3 Validate both records in `validateState` and accept a save without
  them, so `pg.game.v4` needs no version bump.

## 3. Evidence

- [x] 3.1 RED: with the command handlers removed, four of the five new SNV
  tests fail with the command rejected; GREEN after registering them.
- [x] 3.2 Unit tests: policy, frequency, invalid input, impairment, Vortox,
  privacy, replay and the read-model choices.
- [x] 3.3 Reclassify both roles as `requires-storyteller-choice`, update the
  matrix rows, `rule.md`, support sets, README and the SNV script count.

## 4. UI

- [x] 4.1 Add `artistProjection` and `savantProjection`; the truth select reads
  the same choice list the command validates.
- [x] 4.2 Add the day-card panels and locale keys in ru, en and az; the panels
  dispatch the commands and keep no rule.

## 5. Verification

- [x] 5.1 `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm test` (627 tests), `npm run build`.
- [x] 5.2 `node scripts/check-acceptance.ts`, `node scripts/openspec-check.ts`,
  `openspec validate --changes --strict` and `openspec validate --specs --strict`.
- [x] 5.3 Run the app at `/table` with an Artist and a Savant game, open the day
  help sheet, record both private actions, and capture desktop and ~390 px
  screenshots in `docs/evidence/after-artist-savant-1280.png` and
  `after-artist-savant-390.png`; no console errors and no horizontal overflow.

## Evidence

- RED: `node --test --test-name-pattern="Artist|Savant" src/core/engine/snv.test.ts`
  with the handlers absent: 4 failed, 1 passed (the rejection test).
- GREEN: the same command: 5 passed.
- GREEN: `node --test src/core/model/support.test.ts ...` → 183 tests passed
  after the support and locale updates.
- GREEN: `npm test` → 627 tests passed; `npm run build`, `npm run fallback` and
  `npm run offline` pass; acceptance (72 roles, 12 test files), provenance
  (82 entries) and source policy pass.
- GREEN: both OpenSpec validators, 11 changes and 24 specs.
- GREEN browser: the day help sheet showed both panels at 1280 px and 390 px,
  both commands recorded the private text, the panels disappeared, the public
  projection contained no question or statement, and the console was clean.
- Pinned sources: `docs/official/wiki/Artist.r3156.wikitext`,
  `Savant.r2910.wikitext`, `Vortox.r3017.wikitext`.
