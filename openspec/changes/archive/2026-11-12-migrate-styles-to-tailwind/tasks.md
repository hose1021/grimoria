# Tasks

## 1. Parity harness and baseline

- [x] 1.1 Add `scripts/style-parity.mjs` with `--record` and `--check`: eight
  routes, two viewports, the property list and the state matrix from
  `design.md` decision 8, waiting on `document.fonts.ready` and the route's
  ready selector. Verify `node scripts/style-parity.mjs --check` fails with
  `baseline missing` before the fixture exists.
- [x] 1.2 Build `origin/main` in a scratch worktree (`npm ci && npm run build`),
  serve it with `node scripts/serve-dist.mjs --root dist --prefix /`, and record
  `scripts/fixtures/computed-styles.json`. Verify the fixture holds 8 routes at
  both viewports and that re-recording produces the same bytes.
- [x] 1.3 Run `node scripts/style-parity.mjs --check` against that served build;
  verify it exits 0 with no difference, so the harness measures the
  pre-migration state rather than a broken selector list.

## 2. Shared primitives

- [x] 2.1 Replace the `btn`/`btn--accent`/`btn--danger`/`btn--quiet` mapping in
  `src/ui/components/button.tsx` with utilities, keep `default` and `accent`
  only, and export `buttonClass(variant)`. Verify the four `<Button>` callers
  render and `/table` matches the baseline.
- [x] 2.2 Replace `field` with utilities in `src/ui/components/field.tsx` and
  export `inputClass`; add `src/ui/components/label.tsx` with `Label` and
  `labelClass`. Verify `npm run typecheck` passes and `/sheet`, `/player`,
  `/table` still match the baseline.
- [x] 2.3 Convert `src/ui/components/language-switch.tsx` to utilities, keeping
  `lang-switch` only as the inert hook; update the legacy DOM screens'
  language control the same way. Verify `node scripts/browser-check.mjs` passes
  the language-switch assertions.

## 3. Setup screens

- [x] 3.1 Convert `/bag` to utilities: every `bag-*` rule becomes classes in
  `src/ui/screens/bag.tsx`, `setup-banner` and `script-*` blocks included;
  remove the converted rules from `css/bag.css` and `css/setup.css`. Verify
  `node scripts/style-parity.mjs --check` reports no difference for `/bag` at
  both widths and `node scripts/browser-check.mjs` passes the bag assertions.
- [x] 3.2 Convert `/seat` to utilities and delete `css/seat.css`. Verify the
  `/seat` baseline matches and the seat browser checks pass, including the
  390 px ring and the 44 px targets.
- [x] 3.3 Convert `/secrets` to utilities, remove the secrets rules from
  `css/setup.css` and delete the emptied file. Verify the `/secrets` baseline
  matches and the secrets browser checks pass.
- [x] 3.4 Delete `css/bag.css` and their links in `index.html` once empty;
  verify `npm run build` succeeds and `npm run verify` reaches the build step.

## 4. Remaining routes

- [x] 4.1 Replace `btn`, `field`, `label`, `brand-*` and `player-card` class
  usage with the primitives or utilities in `src/ui/screens/{sheet,player,public}.tsx`
  and `src/ui/screens/table/*`. Verify the `/sheet`, `/player` and `/table`
  baselines still match.
- [x] 4.2 Replace the class strings in `src/entry/screens/help.ts` and
  `demo.ts`. Verify the `/help` and `/demo` baselines match and their browser
  checks pass.
- [x] 4.3 Move the banner, storage, offline, theme-picker and `#screen` markup
  in `index.html` to utilities (`min-h-dvh` for the screen root); verify
  `node scripts/browser-check.mjs` passes the update-banner and storage-status
  assertions.

## 5. One global stylesheet

- [x] 5.1 Rewrite `css/app.css` as the Tailwind entry: `@import "tailwindcss"
  source(none)`, the three `@source` entries, the `@theme` block (palette,
  `--radius`, `--pad`), the Inter `@font-face`, `@custom-variant short`, the
  `player-reveal` keyframes and the six base rules from `design.md` decision 4.
  Verify `npm run build` emits one CSS asset that contains `--color-panel`, the
  preflight marker and `player-reveal`.
- [x] 5.2 Delete `src/ui/styles/shell.css` and `src/ui/styles/tokens.css`, drop
  the CSS import from `src/ui/main.tsx`, and link only `css/app.css` in
  `index.html`. Verify `npm run dev` loads every route without a 404 and the
  build emits no second stylesheet.
- [x] 5.3 Keep the base reset explicit instead of Preflight: confirm the
  recorded baseline still holds after the merge, and drop the `!` overrides
  that the removed legacy rules made necessary. Verify
  `node scripts/style-parity.mjs --check` passes for all eight routes at both
  widths.
- [x] 5.4 Remove the tokens no utility or rule uses (the census lists
  `--font-role`), and remove `card`, `btn--danger` and `btn--quiet` with their
  rules. Verify `node scripts/check-types-policy.mjs` after 5.5 and the parity
  check both pass.
- [x] 5.5 Add the new failure cases to `scripts/check-types-policy.test.mjs`
  (second stylesheet, duplicate `:root` declaration, dead token, dangling
  `var()`), then rewrite `scripts/check-types-policy.mjs` to the rules in
  `design.md` decision 9 and delete the mirror assertions. Verify
  `node --test scripts/check-types-policy.test.mjs` fails before the rewrite
  and passes after it, and that `node scripts/check-types-policy.mjs` exits 0
  on the finished tree.

## 6. Documentation and integration

- [x] 6.1 Update `docs/architecture.md` (UI shell and build sections), the
  deleted `src/ui/styles/AGENTS.md` guidance into `css/AGENTS.md`, the
  `src/ui/AGENTS.md` link, the root `AGENTS.md` file table and `SPEC.md` style
  notes. Verify no document still names `shell.css`, `tokens.css`,
  `bag.css`, `seat.css` or `setup.css`.
- [x] 6.2 Run `npm run verify`, `node scripts/browser-check.mjs` and
  `openspec validate --changes --strict`; verify all three pass, then push the
  branch and open the pull request with `OpenSpec change:
  migrate-styles-to-tailwind` and `Issue: #137`, and stop for the owner.

Evidence:

- RED: `node scripts/style-parity.mjs --check` → `baseline missing` before the
  fixture exists; `node --test scripts/check-types-policy.test.mjs` → the four
  new cases fail before the policy rewrite.
- GREEN: `node scripts/style-parity.mjs --check` → exits 0 for all eight routes
  after the conversion; `node --test scripts/check-types-policy.test.mjs` and
  `node scripts/check-types-policy.mjs` → pass on the finished tree.

## Workflow follow-up

- Wait for the owner's review; do not merge.
- After an owner merge, archive the change once `npm test`,
  `node scripts/openspec-check.mjs` and `openspec validate --specs --strict`
  pass, then remove the worktree and delete the branch.
