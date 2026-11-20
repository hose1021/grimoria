# Tasks

## 1. Contract

- [x] 1.1 Add the `adjudication` arm with the `registration` case.
- [x] 1.2 Declare the Spy's and Recluse's options in their modules.
- [x] 1.3 Replace the engine registration map with the module lookup.

## 2. Verification

- [x] 2.1 Existing host-choice, registration and architecture tests pass.
- [x] 2.2 `npm test` 705 pass.
- [x] 2.3 Typecheck, format and acceptance pass.

## Evidence

- RED: before the move, `legalRegistrations("spy")` read the engine map and
  the Spy module declared no adjudication capability, so the architecture
  could not prove the role owns its options.
- GREEN: `node --test src/core/roles/architecture.test.ts
  src/core/engine/host-choice.test.ts src/core/engine/engine.test.ts` passes
  101/101.
- GREEN: `npm test` passes 705/705; typecheck and acceptance pass.
