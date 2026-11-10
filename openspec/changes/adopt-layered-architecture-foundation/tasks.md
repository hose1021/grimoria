# Tasks

Implementation starts only after the owner accepts this proposal. Each stage is
a separate commit on the same branch and can be reverted on its own. No stage
changes a game rule, the schema, the storage key or a public URL.

## 1. Typed command surface

- [ ] 1.1 Add `src/core/commands/contracts.ts` with `CommandPayloads` (37 entries, one per registry entry in `js/engine/commands.js:409`), `CommandInput`, `Command`, `CommandType`, and `src/core/commands/result.ts` with `DomainAllowed`, `DomainRejected`, `StorytellerChoice`, `DomainOutcome`, `DispatchResult`, `RejectCode` and `FollowUp`. Add `src/core/commands/contracts.test-d.ts` with one positive assignment per result variant and a negative assignment for a wrong payload on `recordVotes`, a read of `reason` on an allowed result, and a choice kind outside `"info" | "redirect" | "setup"`.
- [ ] 1.2 Add `tsconfig.core.json` (extends `tsconfig.app.json`; `lib: ["ES2022"]`, `types: []`, include `src/core/**/*.ts` and `src/application/**/*.ts`, no DOM) and `tsconfig.app.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `rewriteRelativeImportExtensions`, `jsx: react-jsx`, `noEmit`). Keep `tsconfig.json` as the legacy `checkJs` gate. Set `typecheck` to run all three.
- [ ] 1.3 Add `src/core/commands/normalize.ts`: `normalizeCommand(input: CommandInput, deps: { ids: IdSource; clock: Clock })` fills `id`, `at`, `rulesetVersion`, rejects an unknown type, a payload that is not an object, and an unsupported `rulesetVersion` before any state read. Cover it in `src/core/commands/normalize.test.ts`, including a JSON-injected payload with an extra field and a missing required field.
- [ ] 1.4 Add `src/core/model/validated.ts`: `ValidatedState` branded with a module-private `unique symbol`, and `validatedFromUnknown(value: unknown)` as the only producer. It calls the existing runtime validator (`validateState` in `js/model.js`) until the validator itself moves; it does not cast before validating. Cover a valid save, a missing player table, an unknown version, and a direct attempt to brand an unvalidated object in a `.test-d.ts`.
- [ ] 1.5 Add the typed event union in `src/core/commands/events.ts` with a payload map keyed by event type, enumerate the names emitted by `deriveEvents` (`js/engine/commands.js:640`), and add a type test that a handler cannot push an unlisted event name.
- [ ] 1.6 Extend `scripts/check-types-policy.mjs` with `LEGACY_ANY_BASELINE` (measured 102 at `94c32dd`), a zero-`any` rule for `src/**`, and a failure when the legacy count grows. Add the three cases to `scripts/check-types-policy.test.mjs`.
- [ ] 1.7 Add `toCommandInput(command: LegacyCommand): CommandInput` in `src/application/dispatch/adapt.ts` for the legacy screens, so `js/store.js` can keep its current `dispatch(command)` shape while the factory accepts `CommandInput`. Cover one representative command from each legacy screen family (`table`, `player`, `seat`, `secrets`, `bag`).

Completion criteria: `npm run typecheck` is zero for all three configurations; every negative type test is consumed; the legacy `any` count is 102 and the check fails at 103. Compatible with the old UI: unchanged, it still dispatches through `js/store.js`.

- RED: `npx tsc -p tsconfig.app.json` fails on the missing contracts and on the negative fixtures before 1.1 and 1.2 land; record the diagnostic count and the first file.
- GREEN: `npm run typecheck` reports 0 diagnostics; `node --test src` passes; `node --test js/*.test.mjs` is still 209/209; `node scripts/check-types-policy.mjs` passes; adding one `: any` to `src` makes it fail.

## 2. Vite build, Pages and offline artifact

- [ ] 2.1 Add `"type": "module"`, the pinned `vite 8.3.7` devDependency (the existing `typescript 5.9.3` stays; React and Tailwind dependencies belong to their own changes) and the scripts `dev`, `build`, `preview`, `typecheck`, `test`, `offline`, `verify`. Run `npm install` and commit the lockfile. Confirm `node --test js/*.test.mjs` still passes after `"type": "module"` and that the `MODULE_TYPELESS_PACKAGE_JSON` warning is gone.
- [ ] 2.2 Move `assets/img`, `assets/fonts` and `assets/data` into `public/assets`, and copy `favicon.svg`, `404.html`, `manifest.webmanifest` and `.nojekyll` into `public/`. URLs stay `assets/img/...`, `assets/fonts/...`, `assets/data/...`. Add `dist/` to `.gitignore`.
- [ ] 2.3 Add `vite.config.ts` (root `.`, `publicDir: "public"`, `build.outDir: "dist"`, `base` from `BASE_PATH` with `/` as the default). Remove the inline `<base>` block from `index.html`; load the boot catalog through `%BASE_URL%` and verify the substitution on the first build (fallback: an absolute public path, which Vite also rewrites). Keep the six stylesheets and the module entry.
- [ ] 2.4 Replace the router root: `js/router.js` takes its root from the caller (`start({ root, handler })`) instead of `new URL("../", import.meta.url)`. The entry point passes the base. Cover `/table`, `/sheet/ru` and the fallback under `/` and under `/pocket-grimoire-go/` in `scripts/browser-check.mjs`.
- [ ] 2.5 Register the worker through the base (`BASE_URL + "sw.js"`), not `"./sw.js"`, because a route two levels deep would otherwise resolve the script under the route. Keep `updateViaCache: "none"`.
- [ ] 2.6 Add `--root` and `--out` arguments to `scripts/build-offline.mjs`; the default remains the repository root for the transition, and the build uses `--root dist --out dist/sw.js`. Exclude `sw.js` from the asset list and keep the `pg-static-` prefix, the message names and the cache-id derivation.
- [ ] 2.7 Rework `js/offline-worker.test.mjs` to generate the worker from a small fixture directory into a temporary path and run it in the same `vm` harness. Keep every protocol assertion: versioned precache, pruning on activation, explicit activation, preflight blocking, offline navigation, network fallback.
- [ ] 2.8 Add `scripts/serve-dist.mjs`: serve `dist/`, answer an existing file with 200, answer an unknown path with `dist/404.html` and status 404, and accept a `--prefix` so the project subpath can be reproduced.
- [ ] 2.9 Extend `scripts/browser-check.mjs` with the build checks: deep reload of `/table` and `/sheet/<lang>` with an observed 404 before the redirect, the restored URL, an unknown route rendering `/table`, the same under `/pocket-grimoire-go/`, and an offline reload after precache.
- [ ] 2.10 CI: `ci.yml` runs `npm ci`, the three `tsc` runs, `node --test js src`, `npm run build` and `node scripts/build-offline.mjs`. `pages.yml` drops the staging copy into `public/` and uploads `dist/`, copying `.nojekyll` into `dist/` explicitly. Deployment stays on push to `main`.

Completion criteria: `npm run build` emits a working `dist/`; every route survives a real 404 on the Pages-like server at the root and under the project subpath; the worker built from `dist` precaches every emitted chunk; the update protocol is unchanged; the 209 existing tests pass.

- RED: `node scripts/browser-check.mjs` against `scripts/serve-dist.mjs` fails because `dist/` does not exist, and the router check fails after the `<base>` removal but before 2.4; record both failures.
- GREEN: `npm run build && node scripts/build-offline.mjs` succeeds; the browser checks pass at both bases; `node --test js/*.test.mjs` is 209/209 plus the reworked worker cases.

## 3. Store boundaries

- [ ] 3.1 Add `src/application/ports/` with `GameStorage` (`read(): unknown | null`, `write(text): void`, `remove()`, `watch(listener): () => void`), `Clock`, `RandomSource`, `IdSource`, `Coordination` and `PreferenceStore`. No port mentions `localStorage`, `window`, `navigator` or `Date.now`.
- [ ] 3.2 Add `src/infrastructure/storage/local-game-storage.ts` (the game key, `pg.game.broken.<timestamp>` backups, the disk-snapshot comparison and the revision bump), `src/infrastructure/coordination/web-locks.ts` (the existing writer lock and the `storage` event bridge), `src/infrastructure/platform/` (Date clock, `crypto.randomUUID` with the current fallback, seeded PRNG) and `src/infrastructure/preferences/local-preferences.ts` (one owner of `pg.lang`, `pg.guided`, `pg.sheetScenario`, `pg.sheetTravellers`). Each adapter is covered by a Node test with a fake backend, no browser.
- [ ] 3.3 Add `src/application/store/create-game-store.ts` with the transaction `normalize → validate → apply on draft → invariants → persist → publish`, a cached snapshot object that changes identity only on publish, undo history capped at 12, `canUndo`, `dispose`, and subscriber isolation (a throwing listener does not block the others).
- [ ] 3.4 Add `CommandRuntime` (`clock`, `ids`, `seed`) to the command path with a default browser implementation, so existing callers of `applyCommand(state, command)` keep working. The store passes its injected runtime; `withClock` takes a clock value instead of a module-level override; the synchronous seeded global replacement stays, with a `ponytail:` comment naming the ceiling and the condition for removing it. Preview timestamp capture moves into the store, keyed by id, fingerprint and initial state.
- [ ] 3.5 Make `js/store.js` a facade: create one store with the browser adapters, keep `export const state` pointing at the live object, and forward `subscribe`, `dispatch`, `save`, `saveIfNeeded`, `undo`, `canUndo`, `run`, `reset`, `replaceState`, `exportGame`, `importGame`, `acknowledgeStorageError`, `hasLocalChanges`, `loadStatus`, `playerById`, `orderedPlayers` and `living`. No screen changes in this stage.
- [ ] 3.6 Correct the failure reporting: `undo()`, `reset()`, `replaceState()` and `importGame()` persist first and report a failed write instead of success. Add the cases to `js/store.test.mjs`: a failing `setItem` on undo leaves the state and history unchanged and returns a failure; the same for import and reset; a refused command still publishes no snapshot.
- [ ] 3.7 Add read-model selectors in `src/application/read-models/` (`publicSnapshot`, `playerSnapshot(seatId)`) as pure functions over `GameState`, reusing `publicGameView` and `shownRoleId`. Assert that the public model contains no role, bluff, note or effect key and that the player model uses `shownRoleId`.
- [ ] 3.8 Prove demo isolation: `js/demo.js` keeps its own state and does not receive the store; add a test that running the demo leaves `pg.game.v4` unchanged.
- [ ] 3.9 Verify the snapshot contract for React without React: repeated `getSnapshot()` returns the same reference; an accepted command changes it once; a rejected command and a persist failure do not; an adopted cross-tab save changes it and clears history.

Completion criteria: the factory and every adapter run in Node with fakes and no browser global; the legacy screens behave as before through the facade; no subscriber sees an unconfirmed change; a second tab cannot overwrite a newer save; a failed write is never reported as success.

- RED: a new `js/store.test.mjs` case that fails a storage write during `undo()` currently returns `true`; record that failure. A second RED: the new factory tests fail because the module does not exist.
- GREEN: `node --test js/*.test.mjs src` passes; `node scripts/check-types-policy.mjs` passes including the import rules; `node --test src/application` proves the transaction order and snapshot identity.

## 4. Documentation, verification and review gates

- [ ] 4.1 Extend `scripts/check-types-policy.mjs` import rules to cover the `src` layers and the browser-global ban in `src/core` and `src/application`, with negative fixtures in `scripts/check-types-policy.test.mjs`: `core` importing `infrastructure`, `application` importing `ui`, `ui` importing `infrastructure`, `core` reading `localStorage`.
- [ ] 4.2 Update `AGENTS.md`: Development Commands (`npm ci`, `npm run typecheck`, `npm run build`, `npm run test`, `node scripts/build-offline.mjs`, `node scripts/serve-dist.mjs`), the module table, the layer rules, and the statements that a build now exists. Remove "There is no `src/` directory", "No bundler, transpile or runtime package manager exists" and "No package manager, lockfile or dependency install is required" in the same commit that makes each of them false.
- [ ] 4.3 Update `SPEC.md`: runtime loading, the `dist/` artifact, the worker source, the layer map and the store factory. Keep the state, screen and acceptance sections unchanged.
- [ ] 4.4 Update `README.md`: the run section (`npm ci`, `npm run dev`, `npm run build`), the Pages note (`dist/`, `.nojekyll`) and remove "no build step" and "still needs no dependency installation or bundler".
- [ ] 4.5 Add `docs/architecture.md` with the layer diagram, the allowed imports, the transaction order and the migration map, so the follow-up changes have one reference.
- [ ] 4.6 Run the full gate: `npm ci`, `npm run typecheck`, `node --test js/*.test.mjs`, `node --test src`, `node --test scripts/check-types-policy.test.mjs`, `node scripts/check-types-policy.mjs`, `npm run build`, `node scripts/build-offline.mjs`, `node scripts/serve-dist.mjs` with the browser checks, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `openspec validate --specs --strict`.
- [ ] 4.7 Open the pull request with the Conventional Commit title, the issue link, the change id, the scope, the non-goals, the checks actually run and the explicit statement that the screen migration is not started. Report the CI result and wait for the owner.
- [ ] 4.8 After the owner merges, sync the four delta capabilities into `openspec/specs/` and archive the change once `node --test js/*.test.mjs src`, `node scripts/openspec-check.mjs` and `openspec validate --specs --strict` pass. Do not merge, sync or archive without that permission.

Completion criteria: every documented command runs as written; each remaining "no build" statement is gone; the change is reviewed and merged by the owner.

- RED: `node scripts/openspec-check.mjs` fails on a requirement whose cited test file is missing, and the new import-rule fixtures fail before 4.1 lands; record both.
- GREEN: the full gate above passes; `openspec validate --changes --strict` reports the change valid.

## Evidence

- RED (proposal stage, no implementation): none. This change is a proposal; the RED/GREEN slots above are filled by the implementing pull request. Proposal checks: `node --test js/*.test.mjs` → 209/209; `npm run typecheck` → 0; `node --test scripts/check-types-policy.test.mjs` → 4/4; `node scripts/check-types-policy.mjs` → passed; `node scripts/openspec-check.mjs` → passed; `openspec validate --changes --strict` → passed; `openspec validate --specs --strict` → passed.
- GREEN (proposal stage): the OpenSpec artifacts validate and the repository checks stay green with no runtime change.
- Implementation evidence: to be recorded per stage, with the exact command and its result.
