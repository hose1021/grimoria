# Tasks

## 1. Evidence baseline

- [x] 1.1 Read ADR 0001, the role-modules, architecture-layers and static-types
      specs, the four active role changes, the role contract, the engine, the
      command path and the store. Recorded the exact current exceptions.
- [x] 1.2 Confirmed `origin/main` is `5465e7e` and the worktree is
      `docs/engine-contracts` with no unrelated change.
- [x] 1.3 Ran `node --test src/core/roles/architecture.test.ts` with an empty
      exception map and recorded the RED failure on the two documented files.

## 2. Decision record

- [x] 2.1 Added `docs/adr/0002-engine-contracts.md` with the dependency rules,
      the step-kind capability model, the one coordinator, the transaction
      boundary, the execution-context ports, the lifecycle guards, versioning
      and the migration order.
- [x] 2.2 Stated that the ADR changes no game rule and adds no behavior.

## 3. OpenSpec change

- [x] 3.1 Added `proposal.md` with `Issue: #209`, the current ownership problem
      and the out-of-scope list.
- [x] 3.2 Added `design.md` with the measured tree, the decisions, the risks
      and the preservation proof.
- [x] 3.3 Added the `game/role-modules` delta for the step-kind capability,
      role dependency direction and slice rule.
- [x] 3.4 Added the `app/architecture-layers` delta for the coordinator,
      transaction, lifecycle and versioning contracts.
- [x] 3.5 Added this task file with evidence lines.

## 4. Architecture control

- [x] 4.1 Added `src/core/roles/architecture.test.ts` with the exact exception
      map and the registry check, using only `node:test`,
      `node:assert/strict`, `node:fs`, `node:path` and `node:url`.
- [x] 4.2 Ran the test on the current tree and recorded GREEN.

## 5. Documentation

- [x] 5.1 Linked ADR 0002 from `docs/architecture.md`.
- [x] 5.2 Corrected only the incomplete capability, coordinator and execution
      port descriptions. The ADR is not duplicated.

## 6. Verification

- [x] 6.1 Ran `npm ci` inside the worktree (72 packages).
- [x] 6.2 Ran `openspec validate --changes --strict`: 15 passed, 0 failed.
- [x] 6.3 Ran `node scripts/openspec-check.mjs`: 24 specs, 15 active changes.
- [x] 6.4 Ran `npm run typecheck`: all four programs pass.
- [x] 6.5 Ran `node --test src/core/roles/architecture.test.ts`: 2 passed.
- [x] 6.6 Ran `npm test`: 650 passed, 0 failed.
- [x] 6.7 Ran `npm run format:check`: all 366 files formatted. Ran
      `/opt/homebrew/bin/npm run lint`: exit 0, because the default `npm` on
      `PATH` is the RTK wrapper and it fails to parse oxlint's output
      (`ESLint output (JSON parse failed: EOF while parsing a value at line 1 column 0)`).
- [x] 6.8 Inspected `git diff`: only the ADR, the OpenSpec change, the new test
      and the architecture link/description change.

## 7. Delivery

- [x] 7.1 Committed with
      `docs(architecture): define the engine contracts and migration order`.
- [x] 7.2 Reported changed files, check results and owner decisions. Did not
      push or merge.

## 8. Slice 9 — explicit execution ports (implemented 2026-11-16)

- [x] 8.1 Replaced the module-level `clockOverride`/`withClock` in
      `src/core/model/state.ts` and the module-level `active` context in
      `src/core/engine/execution.ts` with one explicit
      `CommandExecutionContext` (`src/core/model/ports.ts`) created per command
      by `runDraft` from the command timestamp and the seeded generator.
- [x] 8.2 Propagated the record through `addLog`, `kill`, `checkWin`,
      `setWinner`, `resolveAttack`, `resolveDemonDeath`, `becomeDemon`, the
      night queue, the day actions, the BMR/S&V outcome paths, the Pukka
      helpers and every `COMMANDS` handler. `src/core/engine/execution.ts` is
      removed; no domain handler reads an ambient clock or generator.
- [x] 8.3 Added the interleaved-session proof in
      `src/core/engine/commands.test.ts`: two games preview/apply through their
      own runtimes, each keeps its own timestamps and ids, and the interleaved
      result equals the same game applied alone.
- [x] 8.4 Added `docs/role-ownership.md` and `scripts/role-ownership.ts`
      (`--check` in `npm run verify`) as the role-by-role ownership ledger.

## 9. Verification

- [x] 9.1 `npm run verify` passes on Node 24 (typecheck, oxlint, format,
      722 tests, build, fallback, offline, source policy, provenance,
      acceptance, ownership ledger).
- [x] 9.2 Browser checks pass, including the new 390 px regression that opens
      the Evil Twin partner choice for a dead holder retained by the
      Vigormortis and ends the night after the Storyteller chooses.
- [x] 9.3 `node scripts/openspec-check.ts` and
      `npx openspec validate --changes --strict` / `--specs --strict` pass.


## Evidence

- RED: `node --test src/core/roles/architecture.test.ts` with an empty
  `ENGINE_IMPORT_EXCEPTIONS` map failed 1 of 2 tests. The assertion listed
  `src/core/roles/imp/role.ts: ../../engine/becoming.ts`,
  `src/core/roles/imp/role.ts: ../../engine/effects.ts`,
  `src/core/roles/sv-common.ts: ../engine/context.ts` and
  `src/core/roles/sv-common.ts: ../engine/retention.ts`.
- GREEN: `node --test src/core/roles/architecture.test.ts` passed 2 of 2 on the
  current tree with the documented exception map.
- GREEN: `npm run typecheck` exited 0 for `tsconfig.json`,
  `tsconfig.app.json`, `tsconfig.core.json` and `tsconfig.test.json`.
- GREEN: `openspec validate --changes --strict` reported 15 passed, 0 failed.
- GREEN: `node scripts/openspec-check.mjs` reported 24 specs and 15 active
  changes.
- GREEN: `npm test` reported 650 tests, 650 passed, 0 failed.
- GREEN: `npm run format:check` reported all 366 files formatted.
- GREEN: `/opt/homebrew/bin/npm run lint` exited 0 with no diagnostics. The
  default `npm` on `PATH` is the RTK wrapper, which fails to parse oxlint's
  output; the repository lint itself passes.
