# Tasks

## 1. Evidence

- [x] 1.1 Read Klutz r1758 and the five `sv.ts` death-step reads.
- [x] 1.2 Add the Klutz role test; it failed before the arm existed.

## 2. Implementation

- [x] 2.1 Add the `death-step` capability arm and `deathStepOf`.
- [x] 2.2 Route every `sv.ts` death-step read through `deathStepOf`.
- [x] 2.3 Migrate the Klutz declaration with the same step and actor.
- [x] 2.4 Regenerate the ownership ledger, manifest and trace.

## 3. Verification

- [x] 3.1 `node --test src/core/roles/klutz/role.test.ts` — 2/2.
- [x] 3.2 `npm test` — 1432/1432.
- [x] 3.3 `npm run verify` — pass.
- [x] 3.4 `node --test scripts/role-ownership.test.ts` — 22/22.
- [x] 3.5 `gates --scope=all`, `check-acceptance`, `openspec-check` and
      `openspec validate --changes --strict`.

## Evidence

- RED: `deathStepOf` did not exist and the Klutz declared only the legacy
  `deathStep`; the new test could not find the arm.
- GREEN: the same test passes; the full suite, gates and verify pass. The
  Klutz step, actor, journal and public projection are unchanged.
