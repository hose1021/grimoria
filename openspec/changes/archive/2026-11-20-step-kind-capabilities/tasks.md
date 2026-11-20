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

## 5. Saint migration

- [x] 5.1 Add the `win` arm and `WinContext`/`WinDecision`.
- [x] 5.2 Move the healthy-execution condition to `saint/role.ts`.
- [x] 5.3 Route `checkWin` through the win coordinator for the executed role.
- [x] 5.4 Keep the existing impaired-Saint and day-scoping tests.

## 6. Pit-Hag migration

- [x] 6.1 Add the `transformation` arm and `TransformationContext`/`Decision`.
- [x] 6.2 Move the impairment and in-play conditions to `pithag/role.ts`.
- [x] 6.3 Keep validation, `replaceCharacter`, the wake suppression and notes in `sv.ts`.
- [x] 6.4 Keep the existing Pit-Hag and acceptance tests.

## 7. Empath migration

- [x] 7.1 Add the `information` arm and `InformationContext`/`Decision`.
- [x] 7.2 Move the evil-neighbour count to `empath/role.ts`.
- [x] 7.3 Keep the impaired options and the step shape in `information.ts`.
- [x] 7.4 Keep the existing Empath and registration tests.

## 8. Verification

- [x] 8.1 Characterization: the existing Imp, Slayer, Saint, Pit-Hag and Empath tests pass unchanged.
- [x] 8.2 `npm test` 651 pass.
- [x] 8.3 `npm run typecheck`, `oxlint`, `format:check` and the source policy pass.
- [x] 8.4 `node scripts/check-acceptance.mjs` and the OpenSpec checks pass.

## Evidence

- RED: with `capabilities` declared but `resolveDemonDeath` still reading
  `module.onDeath`, `node --test src/core/roles/architecture.test.ts` reports
  the two remaining Imp engine imports; the engine succession tests also fail
  because no hook is found.
- RED: with the day capability declared but `useSlayer` still applying the old
  branch, the new miss test and the existing hit/impairment tests cannot
  exercise the coordinator.
- RED: with the Saint capability declared but `checkWin` still scanning for the
  saint death directly, the new win coordinator is not exercised.
- RED: with the Pit-Hag capability declared but `sv.ts` still applying the old
  branch, the existing Pit-Hag tests cannot exercise the transformation
  resolver.
- RED: with the Empath capability declared but `information.ts` still calling
  `empathCount` directly, the existing Empath tests cannot exercise the
  information resolver.
- GREEN: `node --test src/core/roles/architecture.test.ts
  src/core/engine/engine.test.ts src/core/engine/commands.test.ts` passes
  134/134.
- GREEN: `npm test` passes 651/651; typecheck, oxlint and acceptance pass.
