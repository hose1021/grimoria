# Tasks

## 1. Prepare

- [x] 1.1 Open the tracking issue, then replace the `Issue:` line in
  `proposal.md` with its number. ([#291](https://github.com/hose1021/grimoria/issues/291))
- [x] 1.2 Create the worktree from the current `origin/main`:
  `git worktree add ../grimoria-table-setup-board -b feat/table-setup-board origin/main`.
- [x] 1.3 RED: add the setup-board case to `scripts/browser-check.ts` next to the
  other table checks. Seed `deal` with eight players, claim three, and assert
  the board, the eight chips in seat order, three claimed and five unclaimed
  chips, the three-of-eight count, one `aria-current` rail item, and the
  `/player` primary; claim all eight and assert the `/seat` primary; seed `seat`
  and assert the first-night primary; assert no role text inside the board and
  no horizontal overflow at 360 and 390 px. Record the failing run:
  `node scripts/browser-check.ts`.

## 2. Shared action classes

- [x] 2.1 Move the dock's action class strings (`disabled`, primary, secondary,
  danger, quiet, outline, icon) from `src/ui/screens/table/dock.tsx` into
  `src/ui/screens/table/styles.ts` as `ACTION_DISABLED`, `ACTION_PRIMARY`,
  `ACTION_SECONDARY`, `ACTION_DANGER`, `ACTION_QUIET`, `ACTION_OUTLINE` and
  `ICON_BUTTON`; import them in the dock with no class change.
- [x] 2.2 Delete the now unused `PRIMARY` constant from `styles.ts` and its
  import in `cards.tsx` once the board uses `ACTION_PRIMARY`.
- [x] 2.3 `npm run typecheck` passes and the dock renders unchanged.

## 3. Setup board

- [x] 3.1 Add `ui.setupRoles`, `ui.setupNames`, `ui.unclaimed`, `ui.claimed` and
  `ui.namesCount` to `src/ui/i18n/locales/ru.ts`, `en.ts` and `az.ts`, with the
  same `{claimed}` and `{total}` parameters in all three.
- [x] 3.2 Add the board class constants to `styles.ts`: the panel, the step
  rail, the step item and its current/done tones, the roster grid, the seat
  chip, the seat number, the claim mark and the primary width.
- [x] 3.3 In `cards.tsx`, replace `SetupPrompt` and `DealCard` with one
  `SetupBoard` for `setup`, `deal` and `seat`: label, step title, four-item
  rail, manual and BMR warnings, roster chips in `state.order` with the claim
  mark and the `.sr-only` claim text, the name count, the secrets error list,
  the one primary action and the quiet route links. Keep the caution line
  (`discussWarning`) for the dealt states and keep `data-act="start-night"` and
  `data-act="demo-15"`.
- [x] 3.4 Point `MainCard` at `SetupBoard` for every phase before `night` and
  remove the two replaced components and their unused imports.
- [x] 3.5 In `index.tsx`, replace the `mx-auto mt-2 grid w-full max-w-[900px]`
  wrapper with the board's stage wrapper: full width up to 1100 px,
  `min-h-full`, top-aligned below 620 px and centred above it.

## 4. Verify

- [x] 4.1 GREEN: `node scripts/browser-check.ts` passes, including the new
  setup-board case and the untouched table, dock and overflow checks.
- [x] 4.2 `npm run typecheck && npm run lint && npm run format:check && npm test`
  pass, including `strings.test.ts` for the five new keys.
- [x] 4.3 `npm run verify` passes.
- [x] 4.4 Run the app (`npm run dev -- --port 8010`) and check `/table` with a
  real eight-player deal at 1440x900 and 390x844: the board fills the stage,
  claimed and unclaimed chips read correctly, one primary per step, the dock
  stays fixed, the console is clean, and no control is under 44 px.
- [x] 4.5 Append one paragraph on the setup board to the Composition section of
  `docs/design-direction.md` without touching the existing edits.
- [x] 4.6 Commit on the branch, push, open the PR against `main` naming the issue
  and `table-setup-board`, report the CI result, then stop. Do not merge.
  ([PR #292](https://github.com/hose1021/grimoria/pull/292) targets `dev`.)

## Evidence

- RED: `node scripts/browser-check.ts` failed at the new case with
  `AssertionError: the setup phase renders the setup board` (`0 !== 1`): no
  `[data-setup-board]` existed before the board was written.
- GREEN: `node scripts/browser-check.ts` passed in 86 s, including the new
  setup-board case and the existing table, dock, privacy, offline and PWA checks.
- GREEN: `npm run typecheck`, `npm run lint` and `npm run format:check` pass;
  `npm test` reports 1183 pass, 0 fail.
- GREEN: `npm run verify` passes: build, fallback, offline cache, source policy,
  official provenance (82 entries), acceptance (72 roles, 48 test files),
  version 0.2.0 and the role ownership ledger.
- GREEN: dev server at 1440x900 and 390x844 with an eight-player deal shows the
  1100 px board, eight chips, three claimed and "Имена: 3 / 8"; the primary is
  `/player`. At 390 px there is no horizontal overflow, the controls are 48 px
  tall and the chips use two columns. The roles step points at `/bag`, the seats
  step at `/seat`, and the secrets step renders the first-night button disabled
  with the secrets errors and three quiet links. The console stayed clean.
- GREEN: PR [#292](https://github.com/hose1021/grimoria/pull/292) — Branch and
  pull request title, Lint and format, Specifications, Type check, Unit tests
  and Playwright regression checks all pass.
