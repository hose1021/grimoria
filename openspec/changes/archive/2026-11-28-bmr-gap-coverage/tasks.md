# Tasks

## 1. Tests

- [x] 1.1 Add the 14 high-severity regression tests.
- [x] 1.2 Add the 9 medium-severity regression tests.
- [x] 1.3 Add the 5 low-severity regression tests and the Goon character assertion.

## 2. Engine

- [x] 2.1 Make `bmrTargetError` read registered life like `completeStep`.

## 3. Register

- [x] 3.1 Mark the 30 covered rows `covered-but-unmapped` with the asserting test.
- [x] 3.2 Re-pin the Goon clause to `How to Run`; correct the Shabaloth and Gossip reasons.

## 4. Verification

- [x] 4.1 `node scripts/build-readiness-matrix.ts` passes.
- [x] 4.2 `node scripts/check-rule-exceptions.ts` passes.
- [x] 4.3 `node --test src/core/engine/bmr.test.ts` passes (204 tests).
- [x] 4.4 `npm test`, `npm run typecheck`, `npm run format:check` pass.
- [x] 4.5 `npm run verify` and `node scripts/verification/gates.ts --scope=all` pass.

- RED: the 28 new tests were absent on the base; the Devil's Advocate case would fail on the base `bmrTargetError` because a registered-dead Zombuul was treated as alive.
- GREEN: `node --test src/core/engine/bmr.test.ts` passes 204/204.
