# Tasks

## 1. Contract

- [x] 1.1 Add `DeathContext`, `DeathDecision` and the `death-trigger` arm.
- [x] 1.2 Add `RoleModule.capabilities`; remove `RoleModule.onDeath`.

## 2. Coordinator

- [x] 2.1 Add `resolveDeathCapability` without importing `death.ts`.
- [x] 2.2 Route `resolveDemonDeath` through the capability with the Imp fallback.

## 3. Imp migration

- [x] 3.1 Move the Scarlet Woman, one-Minion and choose-heir rules to the module.
- [x] 3.2 Remove the engine imports from `imp/role.ts`.
- [x] 3.3 Remove the Imp entries from the architecture exception map.

## 4. Verification

- [x] 4.1 Characterization: the existing Imp succession tests pass unchanged.
- [x] 4.2 `npm test` 650 pass.
- [x] 4.3 `npm run typecheck`, `oxlint`, `format:check` and the source policy pass.
- [x] 4.4 `node scripts/check-acceptance.mjs` and the OpenSpec checks pass.

## Evidence

- RED: with `capabilities` declared but `resolveDemonDeath` still reading
  `module.onDeath`, `node --test src/core/roles/architecture.test.ts` reports
  the two remaining Imp engine imports; the engine succession tests also fail
  because no hook is found.
- GREEN: `node --test src/core/roles/architecture.test.ts
  src/core/engine/engine.test.ts src/core/engine/commands.test.ts` passes 131/131.
- GREEN: `npm test` passes 650/650; typecheck, oxlint and acceptance pass.
