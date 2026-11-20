# Tasks

## 1. Rule and source

- [x] 1.1 Read `docs/official/wiki/Cerenovus.r3048.wikitext` and record the
      "next day or night" window.
- [x] 1.2 Confirm the Mutant's standing madness is a different window and must
      stay executable at night (Mutant r1755).

## 2. Implementation

- [x] 2.1 Change the Cerenovus `expires` from night N+1 to day N+1.
- [x] 2.2 Exclude only a Cerenovus token told on the current night from the
      UI projection and from `madnessPenalty`, with `error.73`.
- [x] 2.3 Update the table night control and its RU/EN/AZ copy.

## 3. Tests

- [x] 3.1 RED: the previous token expectation failed at night 2; the new
      assertion is active at night 2 and inactive at day 2.
- [x] 3.2 GREEN: `node --test src/core/engine/snv.test.ts` and
      `src/application/read-models/table.test.ts`.
- [x] 3.3 A Cerenovus execution is allowed on the following night.
- [x] 3.4 A Cerenovus token told on the current night is rejected with
      `error.73`.
- [x] 3.5 A Mutant can be executed on the first night.
- [x] 3.6 A fresh Cerenovus token is absent from the current-night projection
      and appears on the next night and the mad day.

## 4. Verification

- [x] 4.1 `npm test` 652 pass, 0 fail.
- [x] 4.2 `npm run typecheck`, `oxlint`, `format:check` pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` passes with 72 matrix roles.
- [x] 4.4 `node scripts/openspec-check.mjs` and
      `openspec validate --changes --strict` pass.

## Evidence

- RED: before the change, `node --test --test-name-pattern="expired or removed madness" src/core/engine/snv.test.ts` asserted `activeMadness(..., { phase: "night", number: 2 }) === null`, and a new assertion for the following-night execution failed with `error.62` because the token had expired.
- GREEN: `node --test src/core/engine/snv.test.ts src/application/read-models/table.test.ts` passes 137/137, including the following-night execution, the same-night rejection with `error.73`, the Mutant first night and the projection window.
- GREEN: `npm test` passes 652/652; `npm run typecheck`, `oxlint`, `format:check`, `node scripts/check-acceptance.mjs` and `node scripts/openspec-check.mjs` pass.
