# Tasks

## 1. Baseline and retirement guard

- [x] 1.1 Create the branch worktree from `origin/main` and record the baseline: `npm test` (472 pass), `npm run typecheck`, `node scripts/check-types-policy.mjs`, `node scripts/check-acceptance.mjs`, `node scripts/openspec-check.mjs`; paste the observed output into the pull request.
- [x] 1.2 Add the retirement rule to `scripts/check-types-policy.mjs`: any relative specifier that resolves under `js/` fails, and `js/` must not exist. Add the matching fixtures to `scripts/check-types-policy.test.mjs` and verify `node --test scripts/check-types-policy.test.mjs` passes for the import fixture while `node scripts/check-types-policy.mjs` now fails with the "legacy tree is retired" message (RED).
- [x] 1.3 Remove the stale transition comment in `src/application/ports/index.ts` that says the engine still lives in `js/engine`; verify `grep -n "js/engine" src/application/ports/index.ts` returns nothing.

## 2. Unbind `src` from the shims

- [x] 2.1 Replace every `js/model.js`, `js/types.js` and other shim import under `src` with its `src/core` target: `src/application/read-models/read-models.test.ts`, `src/application/store/create-game-store.test.ts`, `src/application/dispatch/adapt.test.ts`, `src/core/commands/contracts.test-d.ts`, `src/core/model/state.test.ts`, `src/core/model/validated.test.ts`, `src/core/model/validated.test-d.ts`, `src/ui/store/use-game.test.ts`; verify `node scripts/check-types-policy.mjs` reports no `src → js` import and `npm run typecheck` passes.
- [x] 2.2 Confirm no `.mjs` test imports a `.ts` module yet: run `node --test "js/**/*.test.mjs"` and record that all 373 tests still pass before the rename.

## 3. Move domain modules and their tests

- [x] 3.1 Move `js/presets.js` to `src/core/model/presets.ts` and rewrite its imports to `./rules.ts`; move `js/presets.test.mjs` to `src/core/model/presets.test.ts`; verify `node --test src/core/model/presets.test.ts` passes 11 tests.
- [x] 3.2 Move `js/engine.test.mjs`, `bmr.test.mjs`, `snv.test.mjs`, `commands.test.mjs`, `setup.test.mjs`, `manual.test.mjs`, `invariants.test.mjs`, `host-choice.test.mjs` and `acceptance.test.mjs` to `src/core/engine/*.test.ts`; rewrite every `./*.js` import to `./index.ts` or the owning module; verify `node --test "src/core/engine/*.test.ts"` passes the same 61 + 81 + 86 + 39 + 7 + 8 + 5 + 10 + 5 tests.
- [x] 3.3 Move `js/scripts.test.mjs` and `js/support.test.mjs` to `src/core/model/*.test.ts`; move `js/types.test-d.ts` to `src/core/model/types.test-d.ts` and point it at `./types.ts`; verify `npm run typecheck` passes and the two test files pass 12 and 16 tests.
- [x] 3.4 Delete `js/shim-exports.test.mjs` and the five shims `js/engine.js`, `js/model.js`, `js/rules.js`, `js/scripts.js`, `js/effect-graph.js`; verify `node --test "src/**/*.test.ts"` passes and no moved test imports a shim.
- [x] 3.5 Update every `docs/rules-matrix.md` row and table cell, and every `openspec/specs/**` citation, that names a file moved in this group; verify `node scripts/check-acceptance.mjs` and `node scripts/openspec-check.mjs` pass.

## 4. Move the UI, infrastructure and entry modules

- [x] 4.1 Move `js/strings.js`, `js/i18n.js` and `js/locales/*` to `src/ui/i18n/` as TypeScript with the same `t(key, vars)`, language and watcher API; move `js/strings.test.mjs` to `src/ui/i18n/strings.test.ts`; move `js/locales/AGENTS.md` to `src/ui/i18n/AGENTS.md`; verify the 3 translation tests pass.
- [x] 4.2 Move `js/roles.js` to `src/infrastructure/catalog/role-catalog.ts`, `js/router.js` to `src/infrastructure/routing/history-router.ts`, and `js/library.js` to `src/infrastructure/library/bag-library.ts`; move `js/library.test.mjs` to `src/infrastructure/library/bag-library.test.ts`; verify its 6 tests pass and `node scripts/check-types-policy.mjs` accepts the layer edges.
- [x] 4.3 Split `js/ui.js`: `esc` to `src/ui/dom.ts`, `basePath`/`assetUrl` to `src/infrastructure/platform/asset-url.ts`; delete the unused `modalFocus`; verify `grep -rn "modalFocus" src js` returns nothing and `npm run typecheck` passes.
- [x] 4.4 Move `js/store.js` to `src/entry/store.ts`, `js/offline.js` to `src/entry/offline.ts`, `js/guidance.js` to `src/entry/guidance.ts`, and `js/help.js`/`js/demo.js` to `src/entry/screens/`; move `js/store.test.mjs` and `js/offline-worker.test.mjs` to `src/entry/store.test.ts` and `src/infrastructure/offline/offline-worker.test.ts`; verify the 14 store tests and 7 worker tests pass.
- [x] 4.5 Move `js/test-entry.js` to `src/entry/test-entry.ts` and point `vite.config.ts` at it; rewrite `src/entry/main.ts` imports to the new modules; add `@source "../../entry/screens/*.ts";` and remove both `js/` sources in `src/ui/styles/shell.css`; verify `npm run build` succeeds and `node scripts/browser-check.mjs` passes `/help` and `/demo`.
- [x] 4.6 Update `docs/rules-matrix.md` and `openspec/specs/**` citations for the files moved in this group; verify `node scripts/check-acceptance.mjs` and `node scripts/openspec-check.mjs` pass.

## 5. Delete the legacy tree and its configuration

- [x] 5.1 Delete `js/`, `js/AGENTS.md` and `js/locales/AGENTS.md`; add the DOM-screen rules to `src/entry/AGENTS.md`; verify `test ! -e js` and `grep -rn "js/" src scripts vite.config.ts package.json tsconfig*.json .github` returns only historical archive paths or nothing.
- [x] 5.2 Remove `js` from `package.json` `test`, `lint`, `format` and `format:check`; set `test` to `node --test "src/**/*.test.ts"`; verify `npm test` reports 470 pass, 0 fail.
- [x] 5.3 Remove `js/**`, `js/types.d.ts` and `checkJs`/`allowJs` from the TypeScript programs: `tsconfig.json` includes `src/entry/**/*.ts` only, `tsconfig.test.json` drops the `js/types.d.ts` entry; verify `npm run typecheck` passes and `grep -n "allowJs\|checkJs\|js/" tsconfig*.json` returns nothing.
- [x] 5.4 Remove `JS_ROOT`, the `legacy` layer, `LEGACY_ANY_BASELINE` and the `js/`-only `any` count from `scripts/check-types-policy.mjs`; verify `node --test scripts/check-types-policy.test.mjs` and `node scripts/check-types-policy.mjs` pass with the new tree.
- [x] 5.5 Change `scripts/check-acceptance.mjs` to require a path in a test citation and to scan only `src` for a second support table; verify `node scripts/check-acceptance.mjs` passes with the updated matrix.

## 6. Documentation, specs and CI

- [x] 6.1 Update `docs/rules-matrix.md` to the new test paths and the 470/371 baseline; verify `node scripts/check-acceptance.mjs` reports every cited test file resolves.
- [x] 6.2 Rewrite every remaining `js/*.test.mjs` citation in `openspec/specs/**` to the new `src/...test.ts` path and drop stale line numbers; verify `node scripts/openspec-check.mjs` and `openspec validate --specs --strict` pass.
- [x] 6.3 Update `SPEC.md`, `AGENTS.md`, `README.md`, `docs/architecture.md`, `src/**/AGENTS.md`, `src/ui/test-probe.tsx`, `src/ui/styles/shell.css` and the `scripts/browser-check.mjs` comment so they describe the single `src/` tree; verify a final `grep -rn "js/" AGENTS.md SPEC.md README.md docs src scripts .github package.json vite.config.ts tsconfig*.json` has no live path (archive history excepted).
- [x] 6.4 Update `.github/workflows/ci.yml` and `.github/workflows/pages.yml` to `node --test "src/**/*.test.ts"`; verify `node --test "src/**/*.test.ts"` runs the same suite locally.

## 7. Integration verification

- [x] 7.1 Run `npm run verify`; verify typecheck, lint, format check, 470 tests, build, fallback, offline worker, policy and acceptance all pass.
- [x] 7.2 Run `node scripts/browser-check.mjs` against the built artifact; verify `/table`, `/sheet`, `/help`, `/demo`, the player handoff and the update flow still pass.
- [x] 7.3 Serve `dist/` with `node scripts/serve-dist.mjs --root dist --prefix /` and smoke `/table`, `/help`, `/demo` and a mobile width around 390 px; record the observed routes and console errors.
- [x] 7.4 Run `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` and `openspec validate --specs --strict`; verify all pass.
- [ ] 7.5 Open the pull request, report the CI result and stop for the owner; do not merge.

## Workflow follow-up

- Archive this change only after the owner merges and every check above passes on the merge result.
- Remove the worktree and delete the local branch after the merge.

## Evidence

- RED: `node scripts/check-types-policy.mjs` after 1.2 reported `js/: the legacy tree is retired and must not exist` plus one violation for every `src -> js` import; the new fixtures passed 34/34.
- GREEN: `npm test` 470/470; `npm run typecheck` clean; direct `oxlint src scripts vite.config.ts` exit 0; `npm run format:check` clean; `npm run build`, `fallback` and `offline` (405 assets); `node scripts/browser-check.mjs` passed every route; `node scripts/check-acceptance.mjs` 72 roles, 12 test files; `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` and `openspec validate --specs --strict` passed. `npm run lint` fails only through the sandbox RTK wrapper (`[rtk: No such file or directory]`); the underlying oxlint command exits 0.
