# Tasks

## 1. Evidence

- [x] 1.1 Read the pinned Philosopher r2421 Summary, Pit-Hag r2998 and States r1039 § Madness.
- [x] 1.2 Record RED for the later-character reconcile: the Pit-Hag does not create the character and no new holder becomes drunk.
- [x] 1.3 Record RED for the role correction and the Fang Gu jump reconcile.

## 2. Implementation

- [x] 2.1 Stop counting a borrowed ability as a character in play; the Pit-Hag may create the chosen absent character.
- [x] 2.2 Export `reconcilePhilosopherDrunk` and call it from the `kind: "role"` correction.
- [x] 2.3 Call `reconcilePhilosopherDrunk` after the direct Fang Gu jump write.
- [x] 2.4 Add or extend the nineteen branch tests and rewrite the old absent-character test.
- [x] 2.5 Update the S&V exception register, re-pin the madness source rows, reclassify the Traveller/exile rows and map every new test.
- [x] 2.6 Regenerate the test manifest, trace, uncovered set, rendered matrices and readiness matrix.

## 3. Verification

- [x] 3.1 `node --test src/core/engine/snv.test.ts src/core/engine/crossrole-oracle.test.ts` — 249/249.
- [x] 3.2 `npm test` — 1477/1477.
- [x] 3.3 `npm run typecheck` — pass.
- [x] 3.4 `npm run format:check` — pass.
- [x] 3.5 `npm run verify` — pass.
- [x] 3.6 `node scripts/check-rule-exceptions.ts` — pass.
- [x] 3.7 `node scripts/verification/gates.ts --scope=all` — pass except the base-branch coverage diff when `VERIFICATION_BASE_REF` is unset.

## Evidence

- RED: `node --test --test-name-pattern="character the Philosopher chose while absent" src/core/engine/snv.test.ts` -> 1 fail. The Pit-Hag leaves the target at `barber` instead of creating the chosen `flowergirl`: `roleInPlay` counted the borrowed ability.
- RED: `node --test --test-name-pattern="role correction that creates the Philosopher|Fang Gu jump re-reconciles" src/core/engine/snv.test.ts` -> 2 fail. The corrected holder is not drunk, and the new Fang Gu keeps the stale philosopher effect.
- GREEN: the same focused commands -> all pass. The Pit-Hag creates the absent character, the correction and the jump both target the current holder, and a jumped Fang Gu is sober for the old borrowed character.
- GREEN: `node --test src/core/engine/snv.test.ts src/core/engine/crossrole-oracle.test.ts` -> 249 tests, 249 pass.
- GREEN: `npm test` -> 1477 tests, 1477 pass. `npm run typecheck` and `npm run format:check` pass. `npm run verify` passes (acceptance: 72 matrix roles, 53 test files; official provenance: 82 entries).
- GREEN: `node scripts/check-rule-exceptions.ts` -> pass, `mechanical-gap=0` in the S&V register.
- Note: `VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all` reports `tb-audit.test.ts` tests added on `origin/dev` after this branch's base commit `536ff1d`; those files are unmodified in this change. Without the base ref the gate reports only that the base ref is unset.
