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

## 4. Slayer migration

- [x] 4.1 Add the `day-action` arm and `DayContext`/`DayDecision`.
- [x] 4.2 Add `applyDayCapability` with the shared kill, succession and win path.
- [x] 4.3 Move the impairment, registration and kill rule to `slayer/role.ts`.
- [x] 4.4 Keep validation, the choice log, the miss log and the spent marker in `day.ts`.
- [x] 4.5 Add the non-Demon miss characterization test.

## 5. Verification

- [x] 5.1 Characterization: the existing Imp and Slayer tests pass unchanged.
- [x] 5.2 `npm test` 651 pass.
- [x] 5.3 `npm run typecheck`, `oxlint`, `format:check` and the source policy pass.
- [x] 5.4 `node scripts/check-acceptance.mjs` and the OpenSpec checks pass.

## Evidence

- RED: with `capabilities` declared but `resolveDemonDeath` still reading
  `module.onDeath`, `node --test src/core/roles/architecture.test.ts` reports
  the two remaining Imp engine imports; the engine succession tests also fail
  because no hook is found.
- RED: with the day capability declared but `useSlayer` still applying the old
  branch, the new miss test and the existing hit/impairment tests cannot
  exercise the coordinator.
- GREEN: `node --test src/core/roles/architecture.test.ts
  src/core/engine/engine.test.ts src/core/engine/commands.test.ts` passes
  132/132.
- GREEN: `npm test` passes 651/651; typecheck, oxlint and acceptance pass.
