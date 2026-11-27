# Tasks

## 1. Red test

- [x] 1.1 Add `seedSnakeCharmerNight` and the dead/living seat assertions to
  `scripts/browser-check.mjs`.
- [x] 1.2 Run `node scripts/browser-check.mjs` against the unchanged picker and
  record the failure.

## 2. Fix

- [x] 2.1 Add the Snake Charmer dead-seat clause to the `disabled` expression in
  `src/ui/screens/table/cards.tsx`.
- [x] 2.2 Assert the engine rejection code in the existing dead-target test in
  `js/snv.test.mjs`.

## 3. Verification

- [x] 3.1 Run `node scripts/browser-check.mjs` and record the passing result.
- [x] 3.2 Confirm `node --test --test-name-pattern="Snake Charmer" js/snv.test.mjs`
  still asserts the `error.55` rejection.
- [x] 3.3 Run `npm run format`, `npm test`, `npm run verify`,
  `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`,
  `openspec validate --specs --strict` and `git diff --check`.
- [x] 3.4 Commit, report and stop; the owner merges.

## Evidence

- RED: with the Snake Charmer clause removed, `node scripts/browser-check.mjs`
  (Playwright 1.65.0 via `PLAYWRIGHT_MODULE`) fails at
  `scripts/browser-check.mjs:1417` with
  `AssertionError [ERR_ASSERTION]: the dead seat is disabled on the Snake Charmer step`
  and `false !== true`: the dead seat is selectable before the fix.
- GREEN: with the clause restored the same command prints
  `Browser checks passed: phone/tablet, night/day, Virgin, route cleanup, privacy, reload, cross-tab, languages, native role sheet, dialog contract, offline project-subpath reload, safe PWA update.`
  `node --test --test-name-pattern="Snake Charmer" js/snv.test.mjs` passes 6/6,
  including the `error.55` assertion.
