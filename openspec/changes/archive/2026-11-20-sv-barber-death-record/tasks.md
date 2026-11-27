# Tasks

## 1. Evidence

- [x] 1.1 Read Barber r1757 and States r1039 from the pinned local snapshots.
- [x] 1.2 Reproduced both gaps: a death before the Barber change and a drunk
      death still enabled the swap.
- [x] 1.3 Recorded RED: both new tests failed.

## 2. Implementation

- [x] 2.1 `deathAsRecently` reads the role and impairment from the death record.
- [x] 2.2 The Barber actor requires a sober death as the Barber.
- [x] 2.3 RED → GREEN on both tests.

## 3. Evidence surfaces

- [x] 3.1 `roles/barber/rule.md` declares `SNV-BARBER-02` and `SNV-BARBER-03`.
- [x] 3.2 `docs/rules-matrix.md` records the death-record gate.

## 4. Verification

- [x] 4.1 `npm test` — 650 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: `node --test --test-name-pattern="died and then became the Barber|Barber who died drunk" src/core/engine/snv.test.ts` failed 2 of 2.
- GREEN: the same command passed 2 of 2; `npm test` reported 650 pass.
