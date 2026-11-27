# Tasks

## 1. Evidence

- [x] 1.1 Read Devil's Advocate r2594 and Moonchild r1783 from the pinned local
      snapshots.
- [x] 1.2 Reproduced both gaps by direct engine execution.
- [x] 1.3 Recorded RED: both new tests failed.

## 2. Implementation

- [x] 2.1 The Advocate execution check runs before the Zombuul replacement.
- [x] 2.2 The Moonchild stores the choice-time alignment and resolves from it.
- [x] 2.3 RED → GREEN on both tests.

## 3. Evidence surfaces

- [x] 3.1 `roles/devilsadvocate/rule.md` cites the new test under
      `BMR-DEVILSADVOCATE-01`.
- [x] 3.2 `roles/moonchild/rule.md` cites the Goon test under
      `BMR-MOONCHILD-01`.
- [x] 3.3 `docs/rules-matrix.md` records both behaviors.

## 4. Verification

- [x] 4.1 `npm test` — 650 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: `node --test --test-name-pattern="Advocate-protected Zombuul|Goon that was good when chosen" src/core/engine/bmr.test.ts` failed 2 of 2.
- GREEN: the same command passed 2 of 2; `npm test` reported 650 pass.
