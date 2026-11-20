# Tasks

## 1. Contract

- [x] 1.1 Add the `execution` arm and the read-only context.
- [x] 1.2 Declare the Pacifist rule in its module.
- [x] 1.3 Route `survivalAllowed` through the coordinator.

## 2. Verification

- [x] 2.1 Existing Pacifist survival tests pass unchanged.
- [x] 2.2 `npm test` 705 pass.
- [x] 2.3 Typecheck, format and acceptance pass.

## Evidence

- RED: before the move, `survivalAllowed` scanned for `roleId === "pacifist"`
  in the engine and the Pacifist module declared no execution capability.
- GREEN: `node --test --test-name-pattern="Pacifist" ...
  src/core/engine/engine.test.ts src/core/engine/bmr.test.ts` passes.
- GREEN: `npm test` passes 705/705; typecheck and acceptance pass.
