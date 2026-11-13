# Tasks

## 1. Failing browser check (RED)

- [x] 1.1 Rewrite `scripts/browser-check.mjs:1539-1548`: press Escape on
  `/player`, then assert `.player-view` count 1, `.host` count 0 and
  `page.url()` still `/player`; then route `/table` and assert `.host` count 1,
  `[data-act="hide"]` count 0, `[data-act="reveal"]` count 0 and
  `[aria-modal="true"]` count 0 with no click in between.
- [x] 1.2 Run `node scripts/browser-check.mjs`, confirm it fails on the first
  new `/table` assertion, and record the command and the failure text.

## 2. Console

- [x] 2.1 Delete `HideOverlay`, its `Overlays` branch and the `COVER` import in
  `src/ui/screens/table/dialogs.tsx`; verify `npm run typecheck` passes and the
  remaining six overlays still render.
- [x] 2.2 Delete the `[data-act="hide"]` button in `SidePanel`
  (`src/ui/screens/table/frame.tsx:332-339`) and `COVER` in
  `src/ui/screens/table/styles.ts`; verify the side panel opens with the storage
  warning and the log, and `grep -rn "COVER" src` returns no hit.
- [x] 2.3 Remove `"hide"` from the `Overlay` union and delete the
  `initialOverlay` parameter of `useTableDrafts` in
  `src/ui/screens/table/drafts.ts`; verify `npm run typecheck` passes.
- [x] 2.4 In `src/ui/screens/table/index.tsx` drop `TableScreenProps.covered`,
  seed the drafts with no overlay, remove the `"hide"` case from the
  privacy-surface early return and the comment that names the hide cover; verify
  a direct `/table` load renders `.host`.

## 3. Shell and route

- [x] 3.1 In `src/ui/shell.tsx` delete `PRIVATE`, the `covered` computation and
  the two `covered` arguments; verify `/table`, `/help` and `/demo` render.
- [x] 3.2 In `src/ui/router.ts` delete `RouteSnapshot.previousPath` and its
  snapshot assignment; verify `grep -rn previousPath src` returns no hit and
  `npm run typecheck` passes.
- [x] 3.3 In `src/ui/legacy-bridge.tsx` and `src/ui/ports.ts` delete the
  `covered` prop and the `mount` options object; verify `/help` and `/demo`
  mount, switch locale and unmount through the browser check.

## 4. Strings

- [x] 4.1 Delete `hide` and `ui.screenHidden` from
  `src/ui/i18n/locales/{ru,en,az}.ts`, and "Hide screen" and "Screen hidden" from
  `src/ui/i18n/translate.ts`; verify `npm test` (locale parity) and
  `npm run typecheck` pass and `playerWarning` stays in all three catalogs.

## 5. Existing checks and fixtures

- [x] 5.1 Delete the defensive `[data-act="reveal"]` click at
  `scripts/browser-check.mjs:1066-1067`; verify the deal-card and night steps
  pass without it.
- [x] 5.2 Run `node scripts/style-parity.mjs --check`; if the diff names a
  `/table` button, re-record `scripts/fixtures/computed-styles.json` and review
  that diff only.
- [x] 5.3 Update `README.md:103`, `SPEC.md:270`, `docs/architecture.md:84` and
  `docs/improvement-implementation.md:12,36` to state that the console opens
  directly after a private route.

## 6. Integration verification

- [x] 6.1 Run `npm run verify`, `node scripts/openspec-check.mjs` and
  `openspec validate --changes --strict`; record the results in the pull
  request.
- [x] 6.2 Smoke `/player` → `/table` and `/public` → `/table` at 390 and 1440
  pixels in a real browser, check the console for errors, and confirm the saved
  game is unchanged across the route change.
- [x] 6.3 After the owner merges, sync `openspec/specs/app/ui-shell/spec.md`:
  remove "Hidden console after a private route", restate "Setup routes open
  without a cover" and add "Console opens directly after a private route", then
  run `openspec validate --specs --strict` before archiving the change.

## Evidence

- RED: `node scripts/browser-check.mjs` failed on the first new `/table`
  assertion with the cover still in place:
  `AssertionError [ERR_ASSERTION]: the console opens directly`, `0 !== 1`,
  `scripts/browser-check.mjs:1552`, exit 1.
- GREEN: `node scripts/browser-check.mjs` passed (phone/tablet, night/day,
  route cleanup, privacy, reload, cross-tab, languages, role sheet, dialog
  contract, offline reload, PWA update). `npm run verify` exited 0 and `npm test`
  reported 480 passing tests. `node
  scripts/style-parity.mjs --record --root dist-root` changed only
  `/table.390x844.default.body.height` and `#screen.height`
  (1573.2px → 1519.2px, the removed side-panel control), and the following
  `--check` matched 8 routes at 2 viewports. A Playwright smoke at 390 and 1440
  pixels reached the console directly from `/player` and `/public` with no
  hide, reveal or modal element, no `Экран скрыт` heading, an unchanged
  `pg.game.v4` value and no console error. `node scripts/openspec-check.mjs`
  passed and `openspec validate --changes --strict` reported 5/5 changes.
- Note: `node scripts/style-parity.mjs --check --root dist` aborts with
  `ERR_HTTP_HEADERS_SENT` from `scripts/serve-dist.mjs` after `npm run verify`
  rewrites `dist` beneath a generated `sw.js`; the same check passes against
  `dist-root`, the artifact `scripts/browser-check.mjs` builds, so the baseline
  is recorded from that directory.

## Workflow follow-up

- Commit, push the branch and open the pull request; never merge it.
- After the owner merges, archive the change once `npm test`,
  `node scripts/openspec-check.mjs` and `openspec validate --specs --strict`
  pass, then remove the worktree and delete the local branch.
