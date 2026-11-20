# Tasks

## 1. Evidence

- [x] 1.1 Read States r1039, Fang Gu r2974 and the Clockmaker page from the
      pinned local snapshots.
- [x] 1.2 Reproduced all three gaps by direct engine execution.
- [x] 1.3 Recorded RED: all three tests failed with the engine changes stashed.

## 2. Implementation

- [x] 2.1 `recordSvOutcome` rejects deaths from an impaired S&V Demon.
- [x] 2.2 The Fang Gu jump requires a living target.
- [x] 2.3 Numeric and yes-no info offer the true value when only impairment
      applies; a Vortox still removes it.
- [x] 2.4 RED → GREEN on all three tests.

## 3. Evidence surfaces

- [x] 3.1 `roles/clockmaker/rule.md` declares `SNV-CLOCKMAKER-02`.
- [x] 3.2 `roles/fanggu/rule.md` declares `SNV-FANGGU-03` and `SNV-FANGGU-04`.
- [x] 3.3 `docs/rules-matrix.md` records the three behaviors.

## 4. Verification

- [x] 4.1 `npm test` — 651 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: `node --test --test-name-pattern="impaired Clockmaker may still|drunk Sects and Violets Demon|already dead Outsider" src/core/engine/snv.test.ts` failed 3 of 3 with the engine changes stashed.
- GREEN: the same command passed 3 of 3; `npm test` reported 651 pass.
