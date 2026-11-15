# Tasks

## 1. Role-id tuple and module contract

- [x] 1.1 Add `src/core/model/role-ids.ts` with the 72-entry `as const` tuple
      and `SupportedRoleId`; the edition lives in each role module and is
      checked against `roleEdition(id)` and the snapshot in stage 2. Verify
      `node --test src/core/model/role-ids.test.ts` passes with the tuple equal
      to `SUPPORTED_ROLES` and to the non-Traveller `tb`/`bmr`/`snv` entries of
      `docs/official/roles.json`.
- [x] 1.2 Add `src/core/roles/types.ts` with `TargetMode`, `NightStepSpec`,
      `RoleDeathEvent` and `RoleModule`; verify `npm run typecheck` accepts an
      empty module for a supported id and rejects one for `"notarole"`.
- [x] 1.3 Add `src/core/roles/<role-id>/role.ts` for all 72 roles, each
      declaring its id and edition and no hook; verify `npm run typecheck` and
      `npm test` pass with no engine change.

## 2. Registry

- [x] 2.1 Add `src/core/roles/registry.ts` as an object literal checked with
      `satisfies Record<SupportedRoleId, RoleModule>`, plus a `roleModule(id)`
      accessor; verify `npm run typecheck` passes.
- [x] 2.2 Add `src/core/roles/registry.test.ts` asserting one entry per
      supported role, the entry id matches its key, and the edition matches
      `roleEdition(id)`; verify `node --test src/core/roles/registry.test.ts`
      passes.
- [x] 2.3 Prove the completeness guard: delete one module entry, run
      `npm run typecheck`, record the error, restore the entry; then add an
      entry for `"notarole"`, record the second error, restore.
- [x] 2.4 Run `npm run verify`, `node scripts/openspec-check.mjs` and
      `openspec validate --changes --strict`; all pass with the engine and every
      existing test unchanged. Locally, `npm test` fails one pre-existing
      Windows-only test (`src/ui/screens/structure.test.ts` compares
      backslash paths to slash prefixes) and `node scripts/check-acceptance.mjs`
      aborts on Windows (`ERR_UNSUPPORTED_ESM_URL_SCHEME: f:`); both files are
      unchanged by this branch and both pass on Linux CI.

## 3. Trouble Brewing modules

- [x] 3.1 Move each Trouble Brewing role's step shape from
      `src/core/engine/night.ts` (`targetModeFor`, the per-role presence checks
      for Ravenkeeper and Undertaker) into that role's `nightStep`; verify
      `node --test src/core/engine/engine.test.ts` passes unchanged.
- [x] 3.2 Make `makeRoleStep` read the acting role's declaration and delete the
      replaced branches; verify `node --test src/core/engine/engine.test.ts
      src/core/engine/commands.test.ts src/core/engine/acceptance.test.ts`
      passes unchanged.
- [x] 3.3 Move the Trouble Brewing death-time handling that is inline in
      `src/core/engine/death.ts` into `onDeath` (Scarlet Woman inheritance is
      the candidate; roles whose behaviour is a win condition or a protection
      query keep it in place); verify the same suites pass unchanged.
- [x] 3.4 Run `npm run verify`; record the diff as module moves only, with no
      assertion line added or removed in `*.test.ts`.

## 4. Bad Moon Rising modules

- [x] 4.1 Move each Bad Moon Rising role's step shape from
      `src/core/engine/bmr.ts` into that role's `nightStep`; verify
      `node --test src/core/engine/bmr.test.ts` passes unchanged.
- [x] 4.2 Move the role-owned death-time handling from `src/core/engine/bmr.ts`
      and `src/core/engine/death.ts` into `onDeath`; verify
      `node --test src/core/engine/bmr.test.ts` passes unchanged. No candidate
      qualified: the Moonchild resolves as a bookkeeping wake (moving it to
      `onDeath` would kill the target at the moment of death, not later that
      night), the Grandmother's "you die too" is a conditional step that already
      lives in `appendBmrConditionalSteps`, and the Zombuul's first death is a
      prevention query in `bmrCannotDie`. `design.md` keeps conditional-step
      and protection code in the engine, so all three stay.
- [x] 4.3 Delete the replaced per-role branches from `bmr.ts`, keeping
      conditional-step, Setup and cross-role code; verify `npm run verify`
      passes and `bmr.ts` shrank (1557 → 1394 lines).

## 5. Sects & Violets modules

- [x] 5.1 Move each Sects & Violets role's step shape from
      `src/core/engine/sv.ts` into that role's `nightStep`; verify
      `node --test src/core/engine/snv.test.ts` passes unchanged.
- [x] 5.2 Move the role-owned death-time handling (Fang Gu succession, Zombuul
      replacement, Vigormortis and No Dashii effect lifetimes where they run on
      a death) into `onDeath`; verify `node --test src/core/engine/snv.test.ts`
      passes unchanged. As in stage 4, no candidate was a role-owned death hook:
      the Fang Gu's jump runs on its own step outcome, the death-triggered wakes
      are conditional steps, and the Vigormortis and No Dashii poison are
      reconciled by the engine. Their step shapes did move: `deathStep` now
      holds the Barber, Sweetheart, Sage and Klutz wakes.
- [x] 5.3 Delete the replaced per-role branches from `sv.ts`, keeping the
      Vortox, Evil Twin, Witch and madness code that spans roles; verify
      `npm run verify` passes (1460 → 1381 lines).
- [x] 5.4 Confirm the public surface: every export of
      `src/core/engine/index.ts` still resolves and no screen or test import
      changed; verify `npm run typecheck` and `node scripts/check-types-policy.mjs`
      pass.

## 6. Rule documentation and identifiers

- [x] 6.1 Add `rule.md` for all 72 roles with an `Edition:` line and one row per
      engine-relevant rule: identifier, the `docs/rules-matrix.md` row it audits,
      the pinned source revision and the asserting test names. No official
      ability text is copied; verify `node scripts/check-acceptance.mjs` reports
      no duplicate identifier, no missing document and no dangling matrix
      reference.
- [x] 6.2 Extend `scripts/check-acceptance.mjs` to require, for every `verified`
      role row, a citation whose test name contains an identifier declared in
      that role's `rule.md` (read from the table, no format assumed), to reject a
      dangling matrix reference, and to reject a citation of a rule documented as
      `host-choice` or `unsupported`; verify the new
      `scripts/check-acceptance.test.mjs` covers a missing identifier, an
      undeclared identifier, a duplicate identifier, a dangling reference and a
      passing citation. The rules live in `scripts/rule-traceability.mjs` so they
      are testable without the repository.
- [x] 6.3 Put the identifiers into the names of the tests cited by verified
      rows, assertions untouched; verify `node scripts/check-acceptance.mjs`
      passes and `git diff` shows only `test("…")` name changes in test files
      (94 test names; a test cited by two roles carries both identifiers).
- [x] 6.4 Update the Test cells in `docs/rules-matrix.md` to the renamed tests;
      verify the matrix counts (94 role rows: 81 verified, 8 host-choice, 3
      implemented-unverified, 2 unsupported) and every `verified` row resolve
      through `node scripts/check-acceptance.mjs`.

## 7. Rules lookup script

- [x] 7.1 Add `scripts/rules-for.mjs <roleId>` printing the official text from
      `docs/official/roles.json`, the matrix rows, the main-spec requirements
      that mention the role, the tests carrying its identifiers and its jinx
      pairs; verify `node scripts/rules-for.mjs imp` prints all five sections and
      exits 0.
- [x] 7.2 Add `scripts/rules-for.test.mjs` covering a supported role, an
      unknown identifier and a missing argument; verify
      `node --test scripts/rules-for.test.mjs` passes.
- [x] 7.3 Run the script for all 72 roles and verify each exits 0 and prints a
      non-empty official-text section.

## 8. Integration

- [x] 8.1 Run `npm run verify`, `node scripts/check-acceptance.mjs`,
      `node scripts/openspec-check.mjs`, `node --test scripts/*.test.mjs` and
      `openspec validate --changes --strict`; all pass.
- [x] 8.2 Run `node scripts/browser-check.mjs` for the 7- and 12-player
      scenarios and verify `/bag`, `/secrets`, `night` and `/table` behave as
      before.
- [x] 8.3 Verify no test assertion changed: `git diff origin/main --
      '*.test.ts' '*.test.mjs'` contains only test-name and import moves, and
      the total test count does not drop.
- [x] 8.4 Update `docs/rules-sources.md` and `AGENTS.md` where they describe the
      engine layout, and verify the documented paths exist.

## Evidence

- GREEN: stages 1-2 - `node --test src/core/model/role-ids.test.ts
  src/core/roles/registry.test.ts` passes 6 tests.
- RED: stage 2.3 - removing `imp` from the registry makes
  `npx tsc -p tsconfig.core.json` fail with `TS1360 … Property 'imp' is missing`;
  adding `notarole: washerwoman` fails with `TS2353 … 'notarole' does not exist
  in type 'Record<…, RoleModule>'`. Both restored; typecheck clean.
- GREEN: stages 1-2 - `npm run typecheck`, `npm run lint`,
  `npm run format:check`, `node scripts/check-types-policy.mjs`,
  `node scripts/check-official.mjs`, `npm run build`, `npm run fallback`,
  `npm run offline`, `node scripts/openspec-check.mjs` and
  `openspec validate --changes --strict` pass; `npm test` passes 600 of 601 with
  the pre-existing Windows path-separator failure named in task 2.4.
- Rules check: compliant. The moved behaviour matches the pinned text at
  `docs/official/wiki/Imp.r3116.wikitext` ("choose a player: they die. If you
  kill yourself this way, a Minion becomes the Imp"),
  `Scarlet_Woman.r3117.wikitext` (five or more alive when the Demon dies),
  `Ravenkeeper.r3125.wikitext` (woken on the night they die),
  `Undertaker.r3115.wikitext` (only an execution death from today),
  `Poisoner.r1737.wikitext`, `Monk.r3124.wikitext`,
  `Fortune_Teller.r3123.wikitext` and `Butler.r3120.wikitext` (target modes).
- GREEN: stage 3 - `node --test src/core/engine/engine.test.ts` passes 80 tests;
  `src/core/engine/commands.test.ts` with `acceptance.test.ts` passes 47;
  `git diff -- '*.test.ts'` against the base is empty, so no assertion moved.
  `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `node scripts/check-types-policy.mjs`, `node scripts/openspec-check.mjs` and
  `openspec validate --changes --strict` pass; `npm test` passes 600 of 601 with
  the pre-existing Windows failure named in task 2.4.
- Rules check: compliant (stage 4). The step shapes match the pinned summaries:
  `Sailor.r1768`, `Courtier.r2968`, `Innkeeper.r3160`, `Gambler.r3073`,
  `Devil's_Advocate.r2594`, `Lunatic.r3112` (bluffs on the first night),
  `Exorcist.r2973`, `Zombuul.r3022` ("if no-one died today"),
  `Pukka.r3074`, `Shabaloth.r1790`, `Po.r3104` (three after a no-one choice),
  `Assassin.r1786`, `Godfather.r2394` (Outsiders first, then a death),
  `Gossip.r1773`, `Professor.r1775`, `Tinker.r1782`, `Moonchild.r1783`,
  `Grandmother.r2978`, `Chambermaid.r2966`.
- GREEN: stage 4 - `node --test src/core/engine/bmr.test.ts` passes 107 tests;
  `git diff -- '*.test.ts'` is empty. `npm run typecheck`, `npm run lint`,
  `npm run format:check`, `node scripts/check-types-policy.mjs`,
  `node scripts/openspec-check.mjs` and `openspec validate --changes --strict`
  pass; `npm test` passes 600 of 601 with the pre-existing Windows failure named
  in task 2.4.
- Rules check: compliant (stage 5). The declared shapes match the pinned
  summaries: `Philosopher.r2421`, `Snake_Charmer.r2905`, `Evil_Twin.r3101`
  (first night only), `Witch.r2682` (lost at three live), `Cerenovus.r3048`,
  `Clockmaker.r2967` (first night only), `Dreamer.r2904`, `Seamstress.r1999`,
  `Mathematician.r3153`, `Pit-Hag.r2998`, `Fang_Gu.r2974`, `No_Dashii.r3158`,
  `Vortox.r3017`, `Vigormortis.r3015`, `Barber.r1757`, `Sweetheart.r2704`,
  `Sage.r3009`, `Flowergirl.r2907`, `Town_Crier.r3145`, `Oracle.r2909`,
  `Juggler.r2401`, `Klutz.r1758`.
- GREEN: stage 5 - `node --test src/core/engine/snv.test.ts` passes 103 tests;
  `git diff -- '*.test.ts'` is empty. `npm run typecheck`, `npm run lint`,
  `npm run format:check`, `node scripts/check-types-policy.mjs`,
  `node scripts/openspec-check.mjs` and `openspec validate --changes --strict`
  pass; `npm test` passes 600 of 601 with the pre-existing Windows failure named
  in task 2.4.
- RED: stage 6 - reverting one cited test name and its matrix citation makes
  `node scripts/check-acceptance.mjs` fail with
  `washerwoman cites "first-night information is computed from real players and
  seats", which carries no rule identifier` and the same line for `chef`. Both
  restored.
- GREEN: stage 6 - `node scripts/check-acceptance.mjs` passes (72 matrix roles,
  12 test files); `node --test scripts/check-acceptance.test.mjs` passes 9 tests
  covering a passing citation, a missing identifier, an undeclared identifier, a
  duplicate identifier, a dangling revision, a host-choice identifier cited as
  verified, a row-count mismatch, an edition mismatch and the document parser.
  The same script now runs on Windows: the model import uses
  `pathToFileURL` instead of a bare path.
- RED: stage 7 - `node --test scripts/rules-for.test.mjs` fails because the
  script does not exist.
- GREEN: stage 7 - `node --test scripts/rules-for.test.mjs` passes 3 tests; the
  script run for all 72 supported roles exits 0 with a non-empty official-text
  section; `node scripts/rules-for.mjs imp` prints the five sections and the
  `TB-IMP-01` test.
- GREEN: stage 6 - `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `node scripts/check-types-policy.mjs`, `node scripts/openspec-check.mjs` and
  `openspec validate --changes --strict` pass; `npm test` passes 600 of 601 with
  the pre-existing Windows failure named in task 2.4.

- GREEN: stage 8 - `npm run verify` passes end to end: typecheck, lint,
  format check, 610 tests, build, fallback, offline (383 assets), source policy,
  official provenance and the acceptance check (72 matrix roles, 12 test files).
  `node --test scripts/*.test.mjs` passes 90 tests; `node scripts/openspec-check.mjs`
  passes 22 specs; `openspec validate --changes --strict` passes 9 changes.
- GREEN: stage 8 - `node scripts/browser-check.mjs` passes every flow (phone and
  tablet, night/day, Virgin, privacy, reload, cross-tab, languages, role sheet,
  dialogs, offline project-subpath reload, fast PWA update) for the 7- and
  12-player games; `/bag`, `/secrets`, the night and `/table` behave as before.
- GREEN: stage 8 - the merged test diff against `ab0a214` changes only
  `test("…")` lines in the four scenario suites and adds three test files; the
  suite grows from 604 to 610 tests, with no assertion edited.
- GREEN: stage 8 - `AGENTS.md` and `docs/rules-sources.md` describe the role
  modules, `rule.md`, the identifier check and `rules-for.mjs`; every path they
  name exists.

## Workflow follow-up

- Commit on `refactor/role-modules`, push, open the pull request naming
  `OpenSpec change: role-modules` and `Issue: #177`, report CI and stop.
- Archive after the owner merges: `npm test`, `node scripts/openspec-check.mjs`,
  `openspec validate --specs --strict`, then remove the worktree and the local
  branch.
