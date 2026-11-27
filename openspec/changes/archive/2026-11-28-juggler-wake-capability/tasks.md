# Tasks

## 1. Evidence

- [x] 1.1 Read Juggler r2401 and the existing `nightStep`/actor behavior.
- [x] 1.2 Add the role test and record it passing against the legacy module.

## 2. Implementation

- [x] 2.1 Declare the Juggler step through a `night-step` capability with
      `timing: "other"`; keep the same `step` and `actor`.
- [x] 2.2 Leave the resolver absent so the engine keeps the answer path.
- [x] 2.3 Regenerate the ownership ledger and test manifest.

## 3. Verification

- [x] 3.1 `node --test src/core/roles/juggler/role.test.ts` — 2/2.
- [x] 3.2 `npm test` — 1424/1424.
- [x] 3.3 `npm run verify` — pass.
- [x] 3.4 `node --test scripts/role-ownership.test.ts` — 22/22.
- [x] 3.5 `gates --scope=all`, `check-acceptance`, `openspec-check` and
      `openspec validate --changes --strict`.

## Evidence

- RED: the role test's `nightStepFor(role, 2)` came from the legacy field; the
  capability declaration did not exist.
- GREEN: the same test passes with the capability; the full suite, gates and
  verify pass. No stored answer, text, journal or command behavior changed.
