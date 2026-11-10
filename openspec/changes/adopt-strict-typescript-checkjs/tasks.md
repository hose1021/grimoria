# Tasks

## 1. Tooling, policy and the first checked set

- [x] 1.1 Add a private `package.json` with a pinned `typescript` devDependency and a `typecheck` script (`tsc --noEmit`); add `package-lock.json`; add `tsconfig.json` with `allowJs`, `strict`, `noEmit`, `checkJs: false`, `include: ["js/**/*.js", "js/types.test-d.ts"]`, `target ES2022`, `module ESNext`, `moduleResolution Bundler`, DOM libraries and `types: []`. Verify `npm ci` and `npm run typecheck` both run.
- [x] 1.2 Add `js/types.d.ts` with the first cross-cutting contracts and `js/types.test-d.ts` with one positive and one `@ts-expect-error` case. Add `// @ts-check` to `js/model.js`, `js/rules.js`, `js/scripts.js` and `js/effect-graph.js`. Run `npm run typecheck`; record the RED diagnostic count and the first failing file before annotating.
- [x] 1.3 Type the state schema v4, `Player`, `Script`, role records and the effect-graph result in the four opted-in files. Do not change logic. Verify `npm run typecheck` reaches zero diagnostics and `node --test js/*.test.mjs` stays at 201 passing tests.
- [x] 1.4 Add `scripts/check-types-policy.mjs` and `scripts/check-types-policy.test.mjs`: fail on `@ts-ignore`/`@ts-nocheck` in `js/**/*.js`, and on `@ts-expect-error` without a same-line reason. Verify with `node --test scripts/check-types-policy.test.mjs`; add a negative fixture that proves each rule fails.
- [x] 1.5 Add a `typecheck` job to `.github/workflows/ci.yml` that runs `npm ci`, `npm run typecheck`, `node --test scripts/check-types-policy.test.mjs` and the policy scan on Node 24. Verify the job commands locally; the workflow result is checked on the PR.
- [x] 1.6 Exclude `.d.ts` files from the offline precache in `scripts/build-offline.mjs`, leaving the update protocol unchanged. Run `node scripts/build-offline.mjs` and verify the cache id and asset count; confirm `types.d.ts` is absent from the asset list.
- [x] 1.7 Update `AGENTS.md` Development Commands with `npm ci`, `npm run typecheck` and the policy script, and correct the stale `156` test count to the observed 201. Verify the documented commands run as written.

## 2. Effects, context and information

- [x] 2.1 Add `// @ts-check` to `js/engine/effects.js`, `js/engine/context.js` and `js/engine/information.js`. Run `npm run typecheck`; record the RED count.
- [x] 2.2 Add `Effect`, `EffectKind`, impairment and information-result contracts; annotate the exported functions without changing logic. Verify `npm run typecheck` is zero and `node --test --test-name-pattern="effect|poison|drunk|information" js/commands.test.mjs js/engine.test.mjs js/bmr.test.mjs` passes.
- [x] 2.3 Add type tests for an invalid effect kind and an active/inactive graph result. Verify `npm run typecheck` and `node scripts/check-types-policy.mjs`.
- [x] 2.4 Run `node scripts/build-offline.mjs`, verify the new cache id, and run `node --test js/*.test.mjs`.

## 3. Setup, death, night, day and corrections

- [x] 3.1 Add `// @ts-check` to `js/engine/setup.js`, `js/engine/death.js`, `js/engine/night.js`, `js/engine/day.js` and `js/engine/corrections.js`. Run `npm run typecheck`; record the RED count.
- [x] 3.2 Add setup, night-step, nomination, death and correction contracts; annotate without changing logic. Verify `npm run typecheck` is zero and `node --test js/engine.test.mjs js/commands.test.mjs js/bmr.test.mjs js/snv.test.mjs` passes.
- [x] 3.3 Add type tests for a night step payload and a rejected correction. Verify `npm run typecheck` and the policy script.
- [x] 3.4 Run `node scripts/build-offline.mjs`, verify the cache id, and run `node --test js/*.test.mjs`.

## 4. Bad Moon Rising and Sects and Violets

- [x] 4.1 Add `// @ts-check` to `js/engine/bmr.js` and `js/engine/sv.js`. Run `npm run typecheck`; record the RED count.
- [x] 4.2 Add BMR/SV outcome and conditional-step contracts; annotate without changing logic. Verify `npm run typecheck` is zero and `node --test js/bmr.test.mjs js/snv.test.mjs js/commands.test.mjs` passes.
- [x] 4.3 Add type tests for a BMR/SV outcome payload and an unknown step key. Verify `npm run typecheck`.
- [x] 4.4 Run `node scripts/build-offline.mjs`, verify the cache id, and run `node --test js/*.test.mjs`.

## 5. Command API and public engine entry

- [x] 5.1 Add `// @ts-check` to `js/engine/commands.js` and `js/engine.js`. Run `npm run typecheck`; record the RED count.
- [x] 5.2 Define `Command`, `CommandResult` (discriminated by `status`), `Event`, `ApplyResult`, `PreviewResult` and the 38-entry registry; annotate `normalizeCommand`, `validateCommand`, `previewCommand`, `applyCommand` and `checkInvariants`. Verify `npm run typecheck` is zero and `node --test js/commands.test.mjs` passes.
- [x] 5.3 Extend `js/types.test-d.ts` with allowed/rejected/choice narrowing, an invalid command payload and a rejection-only field without narrowing. Verify each `@ts-expect-error` is consumed and `npm run typecheck` passes.
- [x] 5.4 Run `node scripts/build-offline.mjs`, verify the cache id, and run `node --test js/*.test.mjs`.

## 6. Store

- [x] 6.1 Add `// @ts-check` to `js/store.js`. Run `npm run typecheck`; record the RED count.
- [x] 6.2 Define `DispatchResult`, `ImportResult`, `LoadStatus`, `ExportGame` and the `state`/`run` signatures; annotate `dispatch`, `save`, `saveIfNeeded`, `undo`, `run`, `importGame` and `exportGame` without changing logic. Verify `npm run typecheck` is zero and `node --test js/store.test.mjs` passes.
- [x] 6.3 Add type tests for `persisted`, `persist-failed` and a rejected import. Verify `npm run typecheck` and the policy script.
- [x] 6.4 Run `node scripts/build-offline.mjs`, verify the cache id, and run `node --test js/*.test.mjs`.

## 7. UI screens

- [x] 7.1 Add `// @ts-check` to `js/router.js`, `js/app.js`, `js/ui.js` and `js/strings.js`; type route, screen and string contracts. Verify `npm run typecheck`, `node scripts/browser-check.mjs`, regenerate `sw.js` and run `node --test js/*.test.mjs`.
- [x] 7.2 Add `// @ts-check` to `js/table.js` and `js/table-dialogs.js`; type the host-screen state and dialog payloads. Verify `npm run typecheck`, browser checks and `sw.js`.
- [x] 7.3 Add `// @ts-check` to `js/bag.js`, `js/seat.js` and `js/secrets.js`; type the bag, seat and secret drafts. Verify `npm run typecheck`, browser checks and `sw.js`.
- [x] 7.4 Add `// @ts-check` to `js/player.js`, `js/public.js`, `js/help.js`, `js/demo.js` and `js/sheet.js`; type projections and the demo game. Verify `npm run typecheck`, browser checks (privacy and role sheet) and `sw.js`.
- [x] 7.5 Add `// @ts-check` to `js/roles.js`, `js/library.js`, `js/presets.js`, `js/offline.js`, `js/writer.js`, `js/i18n.js` and `js/locales/*.js`; type the catalog, preset, update and translation shapes. Verify `npm run typecheck`, browser checks (languages and PWA update) and `sw.js`.

## 8. Full coverage and verification

- [x] 8.1 Set `checkJs: true`, keep every `// @ts-check` pragma and confirm no runtime `.js` file is excluded. Run `npx tsc --noEmit --listFiles` and compare the checked runtime files with `git ls-files 'js/**/*.js'`; every runtime file must be checked.
- [x] 8.2 Run `node scripts/check-types-policy.mjs`; confirm no `@ts-ignore`, `@ts-nocheck` or unexplained `@ts-expect-error`. Verify `npm run typecheck` is zero.
- [x] 8.3 Run `node --test js/*.test.mjs` and record the pass count (209 on the merged main base); run `node --test scripts/check-types-policy.test.mjs`; run `node scripts/browser-check.mjs` with the project Playwright module.
- [x] 8.4 Run the save-compatibility checks: `node --test js/store.test.mjs` and `node --test js/scripts.test.mjs`; load a v2, v3 and v4 fixture and export a v4 game, confirming the storage key, schema and export envelope are unchanged.
- [x] 8.5 Run `node scripts/build-offline.mjs`; verify the cache id, asset count, absence of `.d.ts` and the offline project-subpath reload in `scripts/browser-check.mjs`. Confirm the GitHub Pages staging list is unchanged.
- [x] 8.6 Run `openspec validate --changes --strict`, `openspec validate --specs --strict` and `node scripts/openspec-check.mjs`; all must pass.
- [ ] 8.7 Open a pull request, verify the `typecheck`, `Unit tests` and `Playwright regression checks` jobs, and report the RED/GREEN evidence. Do not merge.

## Evidence

- RED: foundation stage, `npm run typecheck` -> 198 diagnostics in `js/model.js`, `js/rules.js`, `js/scripts.js` and `js/effect-graph.js`.
- RED: stage 2 -> 87; stage 3 -> 203; stage 4 -> 151; stage 5 -> 235; stage 6 -> 22.
- GREEN: every completed stage reaches `npm run typecheck` -> 0 for its opted-in files; `node --test js/*.test.mjs` -> 201 passing after each stage.
- GREEN: `sw.js` cache ids progressed through `05f1566c872edaba`, `77675a744ada6933`, `7585d55a5e80054b`, `43bb49d63dce1fb5`, `c16c6d2455020bec`, `cdb34b7535bbaa45`, final `424` assets.
- GREEN: full `npm run typecheck` with `checkJs: true` -> 0 diagnostics; `node scripts/check-types-policy.mjs` passed; `node --test js/*.test.mjs` -> 209/209 on the merged main base; `node --test scripts/check-types-policy.test.mjs` -> 4/4.
- GREEN: `npx tsc --noEmit --listFiles` covers every runtime `js/**/*.js`; 45 checked entries = 43 runtime JS + `types.d.ts` + `types.test-d.ts`, with 0 unchecked runtime files.
- GREEN: browser checks passed (phone/tablet, night/day, Virgin, route cleanup, privacy, reload, cross-tab, languages, role-sheet filters, offline subpath, PWA update); `sw.js` cache `f33058a826249385`, 424 assets; `git diff --check` clean.
- BLOCKED: 8.7 needs a feature branch and a pull request. The workspace policy blocks branch switching, and no push or PR was requested; no merge was performed.

## Workflow follow-up

- After the owner merges the pull request, sync the `app/static-types` spec and archive this change.
- Do not merge or archive in this change.
