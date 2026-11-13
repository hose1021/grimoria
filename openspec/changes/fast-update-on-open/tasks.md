# Tasks

## 1. RED: prove the current update path fails

- [ ] 1.1 Extend the update scenario in `scripts/browser-check.mjs`: open a fresh
      page after a deploy and require the new version without a click; require a
      deploy detected after open to keep the prompt; require a window that cannot
      save to reload anyway.
- [ ] 1.2 Run `node scripts/browser-check.mjs` on the current code and record the
      exact failing assertion in the PR body.

## 2. One locale map, filtered precache list

- [ ] 2.1 Add `src/infrastructure/catalog/locale-files.ts` exporting the code →
      catalog map, and import it from `role-catalog.ts` in place of the private
      `FILES` constant. No behavior change.
- [ ] 2.2 Import the same map in `scripts/build-offline.mjs` and skip
      `assets/data/*.js` entries outside it, for both the asset list and the cache
      id hash input.
- [ ] 2.3 Cover the filter in `src/infrastructure/offline/offline-worker.test.ts`:
      the three loadable catalogs are precached, an unreachable catalog is not.
- [ ] 2.4 `npm run build && npm run offline`, then confirm the emitted list has no
      `cs_CZ`, `zh_CN` or other unreachable catalog and still has `ru_RU`,
      `en_GB`, `az_AZ`.

## 3. Opening check and automatic activation

- [ ] 3.1 In `src/entry/offline.ts`, call `reg.update()` as soon as registration
      resolves and let the throttle govern only later checks.
- [ ] 3.2 Auto-apply the worker installed by the opening check and a worker
      already waiting at open: save best-effort, send `SKIP_WAITING`, reload once.
- [ ] 3.3 Reload on `controllerchange` regardless of the save result, and delete
      the preflight (`answerPreflight`, `askWorker`, `PREFLIGHT_TIMEOUT`) with the
      phases `failed`, `peerFailed`, `unconfirmed` and `reloadBlocked`.
- [ ] 3.4 Delete the strings of the removed phases from
      `src/ui/i18n/locales/{ru,en,az}.ts`.
- [ ] 3.5 In `scripts/build-offline.mjs`, delete `prepareUpdate` and answer a
      transitional `PREPARE_UPDATE` with `{ ok: true }` so a page on the previous
      code can still activate this worker.
- [ ] 3.6 Unit coverage in `offline-worker.test.ts`: `SKIP_WAITING` activates with
      no preflight, and `PREPARE_UPDATE` receives an ok reply.

## 4. GREEN, docs and delivery

- [ ] 4.1 Run `node scripts/browser-check.mjs`; the new assertions pass and the
      reload count is one per window.
- [ ] 4.2 Rewrite the update paragraph in `SPEC.md` to the new rule.
- [ ] 4.3 `npm run verify` and `openspec validate --changes --strict`.
- [ ] 4.4 Commit, push, open the pull request, report CI; do not merge.

## Evidence

- RED: pending. Task 1.2 runs `node scripts/browser-check.mjs` on the current
  code and records the first failing new assertion here.
- GREEN: pending. Task 4.1 records the browser-check result and task 4.3 the
  `npm run verify`, `openspec validate --changes --strict` and
  `node scripts/openspec-check.mjs` results here.
