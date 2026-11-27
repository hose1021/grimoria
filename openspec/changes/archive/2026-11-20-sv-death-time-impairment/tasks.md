# Tasks

## 1. Evidence

- [x] 1.1 Read States r1039, Sweetheart r2704 and Klutz r1758 from the pinned
      local snapshots.
- [x] 1.2 Reproduced both gaps by removing the death-time poison before the
      ability resolved.
- [x] 1.3 Recorded RED: both new tests failed.

## 2. Implementation

- [x] 2.1 `failedAtDeath` reads the latest death's impairment.
- [x] 2.2 The Sweetheart and Klutz use it; the live graph is a legacy fallback.
- [x] 2.3 The existing drunk-Klutz fixture applies the effect before the death.
- [x] 2.4 RED → GREEN on both tests.

## 3. Evidence surfaces

- [x] 3.1 `roles/klutz/rule.md` declares `SNV-KLUTZ-02`.
- [x] 3.2 `roles/sweetheart/rule.md` declares `SNV-SWEETHEART-02`.
- [x] 3.3 `docs/rules-matrix.md` records both behaviors.

## 4. Verification

- [x] 4.1 `npm test` — 650 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: `node --test --test-name-pattern="Klutz poisoned at death|Sweetheart poisoned at death" src/core/engine/snv.test.ts` failed 2 of 2.
- GREEN: the same command passed 2 of 2; `npm test` reported 650 pass.
