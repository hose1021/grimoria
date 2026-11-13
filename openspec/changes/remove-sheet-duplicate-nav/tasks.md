# Tasks

## 1. RED

- [x] 1.1 In `scripts/browser-check.mjs`, replace the `.sheet-langs` language
      step: open `[data-app-bar-toggle]`, press `[data-lang="{code}"]`, then wait
      for `document.documentElement.lang` and `location.pathname` to end in
      `/sheet/{code}`. Add an assertion that `.sheet-head a` has count 0 and that
      the open panel carries `a[href$="/table"]`, `a[href$="/help"]` and
      `.lang-switch`. Verify RED: `npm ci`, then
      `PLAYWRIGHT_MODULE=/Users/hose/node_modules/playwright/index.mjs node
      scripts/browser-check.mjs` fails on the header assertion (five anchors
      today) and on the menu language step while the header links still exist.
- [x] 1.2 Write the RED command and its first failing assertion into the pull
      request body; leave the check untouched after the RED run.

## 2. Implementation

- [x] 2.1 Delete the `.sheet-nav` block from `src/ui/screens/sheet.tsx`, with the
      table link, the Help link and the `LANGS` list that only it used. Keep the
      title, intro, summary, scenario filter and Travellers toggle. Verify
      `npm run typecheck` exits 0 and the file has no `LANGS` or `sheet-langs`
      left.
- [x] 2.2 In `src/entry/main.ts`, make `changeLanguage` land on the sheet's
      language path: after loading the catalog, `go(/^\/sheet(\/|$)/.test(route)
      ? "sheet/" + code : route)` where `route = current()`. Verify on
      `npm run dev`: from `/sheet/ru`, open the menu, choose AZ, and the URL
      becomes `/sheet/az` with Azerbaijani role names; the same step on `/table`
      keeps that route.
- [x] 2.3 Verify no tracked document or script still selects the removed hooks:
      search for `.sheet-nav` and `sheet-langs` and expect hits only in the
      browser check edited in 1.1.
- [x] 2.4 GREEN: run `PLAYWRIGHT_MODULE=/Users/hose/node_modules/playwright/index.mjs
      node scripts/browser-check.mjs` and verify the sheet role counts, the
      scenario filter, the Travellers section, the menu language switch, the
      reload persistence and the read-only game state all pass.

## 3. Baseline and full checks

- [x] 3.1 Build the test artifact (`BASE_PATH=/ npx vite build --mode test`),
      run `node scripts/style-parity.mjs --check --root dist` and read the diff:
      expect `/sheet/en` to change because the generic probes `#screen a` and
      `#screen p` now resolve to other elements. Re-record with
      `node scripts/style-parity.mjs --record --root dist`, verify
      `git diff scripts/fixtures/computed-styles.json` touches `/sheet/en` only,
      and write the measured difference into the pull request.
- [x] 3.2 Run `node scripts/style-parity.mjs --check --root dist` again and verify
      it exits 0 against the new baseline.
- [x] 3.3 Run `npm run verify`; verify typecheck, lint, format check, unit tests,
      build, fallback, offline and the policy check all exit 0.
- [x] 3.4 Run `node scripts/openspec-check.mjs` and
      `openspec validate --changes --strict`; verify both exit 0 with no warning
      for this change.

## Evidence

- RED: `PLAYWRIGHT_MODULE=/Users/hose/node_modules/playwright/index.mjs node
  scripts/browser-check.mjs` exits non-zero at the sheet header assertion (five
  anchors before 2.1) and at the menu language step; the command and the first
  failing assertion go into the pull request body.
- GREEN: the same browser check passes the sheet role counts, the scenario
  filter, the Travellers section, the menu language switch, the reload and the
  read-only game state after 2.1 and 2.2; `node scripts/style-parity.mjs --check
  --root dist` exits 0 after the `/sheet/en` re-record.

## Workflow follow-up

- Run the browser check at 390 and 1440 CSS pixels on `/sheet/ru` and confirm the
  header holds no link while the panel holds the route links and the language
  switch.
- Commit, push the branch and open the pull request; never merge it.
- After the owner merges, archive the change, then remove the worktree and the
  local branch.
