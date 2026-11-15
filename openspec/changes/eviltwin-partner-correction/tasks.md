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

## Evidence

- RED: before the implementation, `CorrectionChange` had no `twin` variant and
  `manualCorrection` returned `error.5`; the new tests failed to compile or
  asserted the missing pair write.
- GREEN: `node --test src/core/engine/twin-correction.test.ts` passes 5/5.
- GREEN: `npm test` passes 653/653; typecheck, oxlint, format, acceptance and
  OpenSpec checks pass.
