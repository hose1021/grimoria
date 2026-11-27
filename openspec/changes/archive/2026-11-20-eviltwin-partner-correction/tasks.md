# Tasks

## 1. Contract

- [x] 1.1 Add the `twin` variant to `CorrectionChange`.
- [x] 1.2 Add the engine validation and the three specific errors.
- [x] 1.3 Write the two player ids and the good twin's role.

## 2. Host surface

- [x] 2.1 Offer the twin action only for an Evil Twin holder.
- [x] 2.2 List only living opposite-alignment partners.
- [x] 2.3 Add EN/RU/AZ copy for the action and the errors.

## 3. Evidence

- [x] 3.1 A good partner on an evil holder.
- [x] 3.2 An evil partner on a good Pit-Hag holder.
- [x] 3.3 Non-holder rejected with `error.75`.
- [x] 3.4 Same-alignment partner rejected with `error.76` and no setup write.
- [x] 3.5 The correction runs through `applyCommand` and records the entry.

## 4. Verification

- [x] 4.1 `node --test src/core/engine/twin-correction.test.ts`.
- [x] 4.2 `npm test`, `npm run typecheck`, `oxlint`, `format:check`.
- [x] 4.3 `node scripts/check-acceptance.mjs` and
      `node scripts/openspec-check.mjs` pass.

## 5. Explicit choice (PR #254 review P0.2)

- [x] 5.1 `normalizeBag` stops selecting `evilTwinGoodId`; a bag without one is
      rejected by setup validation.
- [x] 5.2 `replaceCharacter` clears both pair ids for a mid-game Evil Twin.
- [x] 5.3 `evilTwinPair` reads only the stored ids; the role fallback is gone and
      a legacy save is resolved once at import.
- [x] 5.4 `endNight` rejects with `error.77` while a living holder has no pair.
- [x] 5.5 The Pit-Hag step note and the Evil Twin night note point at the `twin`
      correction; RU/EN/AZ copy added.
- [x] 5.6 Tests: bag rejection, unpaired creation, blocked night, chosen pair,
      preview/apply/replay agreement, no win on an unchosen pair.

## Evidence

- RED: before the implementation, `CorrectionChange` had no `twin` variant and
  `manualCorrection` returned `error.5`; the new tests failed to compile or
  asserted the missing pair write.
- GREEN: `node --test src/core/engine/twin-correction.test.ts` passes 5/5.
- GREEN: `npm test` passes 653/653; typecheck, oxlint, format, acceptance and
  OpenSpec checks pass.
- RED (P0.2): `node --test src/core/engine/evil-twin-choice.test.ts` before the
  fix — `a bag with the Evil Twin keeps no automatically chosen good twin`
  (`'clockmaker' !== null`), `a Pit-Hag-created Evil Twin starts unpaired and
  blocks the end of the night` (`'2' !== null`), and `an unchosen pair never
  awards the Evil Twin win` (`evil-twin` winner instead of none).
- GREEN (P0.2): the same file passes 3/3; `npm test` passes 708/708; typecheck,
  acceptance and OpenSpec checks pass.
