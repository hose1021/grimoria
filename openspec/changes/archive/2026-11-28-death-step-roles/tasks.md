# Tasks

## 1. Evidence

- [x] 1.1 Read the Klutz death-step migration and the three legacy modules.
- [x] 1.2 Add the combined declaration test; record the RED on the legacy
      `nightStep` access.

## 2. Implementation

- [x] 2.1 Move Barber, Sage and Sweetheart `nightStep`/`deathStep` to the
      `night-step`/`death-step` arms with `timing: "other"`.
- [x] 2.2 Keep the same actor functions and step shapes.
- [x] 2.3 Update the Sage/Sweetheart tests to `nightStepFor`.
- [x] 2.4 Regenerate the ownership ledger, manifest and trace.

## 3. Verification

- [x] 3.1 Combined role test — 3/3; Sage/Sweetheart tests — 5/5.
- [x] 3.2 `npm test` — 1435/1435.
- [x] 3.3 `npm run verify` — pass.
- [x] 3.4 `node --test scripts/role-ownership.test.ts` — 22/22.
- [x] 3.5 `gates --scope=all`, acceptance, OpenSpec strict.

## Evidence

- RED: the three roles had no capability arms; `deathStepOf` used the fallback
  and `nightStepFor` used the legacy field.
- GREEN: all three declare both arms; the full suite, verify and gates pass.
  The step, actor, conditional wake, journal and public projection are
  unchanged.
