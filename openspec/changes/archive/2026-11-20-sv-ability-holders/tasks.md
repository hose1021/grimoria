# Tasks

## 1. Evidence

- [x] 1.1 Read Juggler r2401, Klutz r1755, Savant r2910, Mathematician r3153
      and Philosopher r2421 from the pinned local snapshots.
- [x] 1.2 Reproduced all four gaps by direct engine execution.
- [x] 1.3 Recorded RED: 4 of 4 new tests failed.

## 2. Implementation

- [x] 2.1 The Juggler guard and Klutz command resolve the ability holder with
      `hasAbility`.
- [x] 2.2 `savantVisit` allows one visit per player per day and appends to
      `savantVisits`.
- [x] 2.3 `recordAbnormal` rejects the Mathematician's own character.
- [x] 2.4 `error.mathematician-self` is translated in en/ru/az.
- [x] 2.5 RED → GREEN on all four tests.

## 3. Evidence surfaces

- [x] 3.1 `roles/philosopher/rule.md`, `roles/savant/rule.md`,
      `roles/mathematician/rule.md` declare the new IDs.
- [x] 3.2 `docs/rules-matrix.md` gains the four rows.

## 4. Verification

- [x] 4.1 `npm test` — 652 pass.
- [x] 4.2 `npm run typecheck` — pass.
- [x] 4.3 `node scripts/check-acceptance.mjs` — pass.
- [x] 4.4 OpenSpec checks — pass.
- [x] 4.5 `npm run format` — clean.

## Evidence

- RED: `node --test --test-name-pattern="borrowed the Juggler|real Savant and a borrowed|borrowed the Klutz records|abnormal command refuses" src/core/engine/snv.test.ts` failed 4 of 4.
- GREEN: the same command passed 4 of 4; `npm test` reported 652 pass.
