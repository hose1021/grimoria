# Tasks

## 1. Failing browser check (RED)

- [x] 1.1 Extend `scripts/browser-check.mjs` with the three spec requirements:
  closed panel at 390, open panel content, desktop inline list at 1440, Escape
  closes and returns focus, outside press closes, a route activation lands on a
  closed panel, no horizontal overflow at 360, `/help` and `/demo` parity, the
  language change from the panel, and no toggle on `/public`.
- [x] 1.2 Run `node scripts/browser-check.mjs`, confirm it fails on the first new
  mobile-menu assertion, and record the command and the failure in the task
  evidence and the pull request.

## 2. Shared menu contract

- [x] 2.1 Add the `menu` string to `src/ui/i18n/locales/ru.ts`, `en.ts` and
  `az.ts`; verify `npm run typecheck` passes and no locale reports a missing
  key at runtime.
- [x] 2.2 Add the toggle, panel, route list and link class strings to
  `src/ui/components/arcane/app-bar-parts.ts`, with `min-[900px]` for the
  inline row and `max-[899px]:hidden max-[899px]:data-[open]:flex` for the
  panel; verify `npm run build` succeeds and the emitted CSS contains the
  literal arbitrary variants.
- [x] 2.3 Add `src/ui/components/arcane/app-bar-menu.ts` with
  `initAppBarMenu(root, signal)`: delegated toggle, Escape with focus return,
  outside `pointerdown`, anchor activation close, and `aria-expanded` plus
  `data-open` as the only state; verify `npm run typecheck` passes.

## 3. React app bar

- [x] 3.1 Render the toggle and the one panel in
  `src/ui/components/arcane/app-bar.tsx`, place the route links, Help, phase
  and `LanguageSwitch` inside it, and bind `initAppBarMenu` in one effect that
  closes on a `current` change; verify the new 390 and 1440 checks pass for
  `/table`, `/bag`, `/seat`, `/secrets`, `/player` and `/sheet`.
- [x] 3.2 Keep `nav={false}` behaviour for `/public`: no toggle, no panel, the
  language switch stays in the tools group; verify the `/public` check passes.

## 4. String-composed app bar

- [x] 4.1 Render the same toggle and panel in
  `src/ui/components/arcane/app-bar-html.ts`; verify `/help` and `/demo` render
  the seven links, Help and the language control in the panel at 390.
- [x] 4.2 Target the injected language select at `[data-app-bar-menu]` in
  `src/ui/i18n/translate.ts`, with the header as fallback; verify a language
  change from the open panel on `/help` keeps the route and applies the locale.
- [x] 4.3 Bind `initAppBarMenu` in `src/entry/screens/help.ts` and
  `demo.ts` with their existing `AbortController`; verify Escape, outside press
  and a demo re-render leave the menu usable.

## 5. Existing checks and fixtures

- [x] 5.1 Update every existing `scripts/browser-check.mjs` step that clicks
  `.lang-switch` at 360 or 390 pixels to open the panel first (or run at 1440);
  verify the full `node scripts/browser-check.mjs` run exits 0.
- [x] 5.2 Re-record `scripts/fixtures/computed-styles.json` and review the
  `#screen select` and `#screen a` diff at 390x844; verify
  `node scripts/style-parity.mjs --check` exits 0.

## 6. Integration verification

- [x] 6.1 Run `npm run verify`, `node scripts/openspec-check.mjs` and
  `openspec validate --changes --strict`; record the results in the pull
  request.
- [x] 6.2 Smoke `/table`, `/help`, `/demo` and `/public` at 390 and 1440 pixels
  in a real browser, check the console for errors, and confirm the saved game
  is unchanged after opening and closing the menu.

## Evidence

- RED: `node scripts/browser-check.mjs` failed on the first new assertion before
  the implementation: `AssertionError [ERR_ASSERTION]: the burger renders at
  390 px`, `false !== true`, `scripts/browser-check.mjs:1869`, exit 1.
- GREEN: `node scripts/browser-check.mjs` passed on three consecutive runs
  (360/390/1440, console errors empty). `npm run verify` exited 0. `node
  scripts/style-parity.mjs --check` exited 0 after the re-record. `node
  scripts/openspec-check.mjs` and `openspec validate --changes --strict`
  passed. Desktop smoke at 1440 px: no burger, 8 inline links on `/table`,
  `/help` and `/demo`; `/public` keeps the language switch and renders no host
  links.

## Workflow follow-up

- Commit, push the branch and open the pull request; never merge it.
- After the owner merges, archive the change once `npm test`,
  `node scripts/openspec-check.mjs` and `openspec validate --specs --strict`
  pass, then remove the worktree and delete the local branch.
