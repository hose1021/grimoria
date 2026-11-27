# Tasks

## 1. RED: prove the current update path fails

- [x] 1.1 Extend the update scenario in `scripts/browser-check.mjs`: open a fresh
      page after a deploy and require the new version without a click; require a
      deploy detected after open to keep the prompt; require a window that cannot
      save to reload anyway.
- [x] 1.2 Run `node scripts/browser-check.mjs` on the current code and record the
      exact failing assertion in the PR body.

## 2. One locale map, filtered precache list

- [x] 2.1 Add `src/infrastructure/catalog/locale-files.ts` exporting the code →
      catalog map, and import it from `role-catalog.ts` in place of the private
      `FILES` constant. No behavior change.
- [x] 2.2 Import the same map in `scripts/build-offline.mjs` and skip
      `assets/data/*.js` entries outside it, for both the asset list and the cache
      id hash input.
- [x] 2.3 Cover the filter in `src/infrastructure/offline/offline-worker.test.ts`:
      the three loadable catalogs are precached, an unreachable catalog is not.
- [x] 2.4 `npm run build && npm run offline`, then confirm the emitted list has no
      `cs_CZ`, `zh_CN` or other unreachable catalog and still has `ru_RU`,
      `en_GB`, `az_AZ`.

## 3. Opening check and automatic activation

- [x] 3.1 In `src/entry/offline.ts`, call `reg.update()` as soon as registration
      resolves and let the throttle govern only later checks.
- [x] 3.2 Auto-apply the worker installed by the opening check and a worker
      already waiting at open: save best-effort, send `SKIP_WAITING`, reload once.
- [x] 3.3 Reload on `controllerchange` regardless of the save result, and delete
      the preflight (`answerPreflight`, `askWorker`, `PREFLIGHT_TIMEOUT`) with the
      phases `failed`, `peerFailed`, `unconfirmed` and `reloadBlocked`.
- [x] 3.4 Delete the strings of the removed phases from
      `src/ui/i18n/locales/{ru,en,az}.ts`.
- [x] 3.5 In `scripts/build-offline.mjs`, delete `prepareUpdate` and answer a
      transitional `PREPARE_UPDATE` with `{ ok: true }` so a page on the previous
      code can still activate this worker.
- [x] 3.6 Unit coverage in `offline-worker.test.ts`: `SKIP_WAITING` activates with
      no preflight, and `PREPARE_UPDATE` receives an ok reply.

## 4. GREEN, docs and delivery

- [x] 4.1 Run `node scripts/browser-check.mjs`; the new assertions pass and the
      reload count is one per window.
- [x] 4.2 Rewrite the update paragraph in `SPEC.md` to the new rule.
- [x] 4.3 `npm run verify` and `openspec validate --changes --strict`.
- [x] 4.4 Commit, push, open the pull request, report CI; do not merge.

## Evidence

- RED: `node scripts/browser-check.mjs` on the unchanged update path failed with
  `page.waitForFunction: Timeout 30000ms exceeded` at
  `scripts/browser-check.mjs:2460` (`waitForLoads`) called from line 2529: the
  page opened with a waiting worker never reloaded, because the old code only
  showed the prompt.
- GREEN: `node scripts/browser-check.mjs` passed in 40.16 s — "Browser checks
  passed: phone/tablet, night/day, Virgin, route cleanup, privacy, reload,
  cross-tab, languages, native role sheet, dialog contract, offline project-subpath
  reload, fast PWA update." The update scenario covers an automatic reload at
  open, an opening check that finds a deploy the page never asked about, a
  prompted later deploy, a failed save that does not stop activation, and two
  windows reloading once each.
- GREEN: `npm run build && npm run offline` emits 380 assets with exactly three
  catalogs (`az_AZ`, `en_GB`, `ru_RU`) instead of 27, so 24 unreachable catalogs
  leave the precache and the cache id hash; the listed files total 9.5 MB.
- GREEN: `npm run verify` exited 0: typecheck, lint, format check, 480 tests,
  build, fallback (`dist/404.html`), offline worker `73b375463b8dbce0` with 381
  assets, source policy and acceptance (72 matrix roles, 12 test files).
- GREEN: `openspec validate --changes --strict` → 5 passed, 0 failed;
  `node scripts/openspec-check.mjs` → 19 specs, 5 active changes.
- CI: pull request #162 — title, type check, unit tests, Playwright regression
  checks, lint and format, and specifications all pass.

