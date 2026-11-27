# Tasks

## 1. Failing browser check (RED)

- [x] 1.1 In `scripts/browser-check.mjs`, add the seat checks: the action controls
  render inside the main column's bottom bar and none render in the left rail;
  exactly one control links to `/player`; no control on the screen links to
  `/secrets`; the bar has no horizontal overflow at 390 pixels; every action
  control is at least 44 pixels high.
- [x] 1.2 Add the exact-order assertion: read the displayed seat names and
  `store.state.order` before activating `[data-act="use"]`, then assert the saved
  order equals the displayed id list and every `player.seat` equals its position
  plus one.
- [x] 1.3 Run `node scripts/browser-check.mjs`, confirm the new assertions fail,
  and record the command and the first failure under Evidence.

## 2. Move the actions into the bottom bar

- [x] 2.1 In `src/ui/screens/seat.tsx`, delete the "Actions" section from the
  left aside and place the same `seat-actions` block in the main footer after
  the status line, keeping `data-act="undo"`, `data-act="shuffle"` and
  `data-act="use"`. Add `role="group"` and
  `aria-label={ports.strings.text("Actions")}`.
- [x] 2.2 Remove the "Секреты" action from the block and both footer anchors
  ("Игроку" and "Далее: секреты"), leaving the moved player anchor as the only
  player control.
- [x] 2.3 Lay out the footer as `flex flex-wrap items-center gap-2` with the
  action group `ml-auto flex flex-wrap justify-end gap-1.5`; below 900 pixels
  drop the auto margin and let the group take the full row.
- [x] 2.4 Remove the now-unused `Next: secrets` entry from
  `src/ui/i18n/translate.ts` in `ru`, `en` and `az`; keep `Actions` and
  `secrets`.
- [x] 2.5 Run `npm run typecheck` and `npm run lint`.

## 3. Verify the change (GREEN)

- [x] 3.1 Run the seat assertions in `node scripts/browser-check.mjs`; confirm
  the new checks pass and the existing seat, tap-through and overflow checks do
  not regress.
- [x] 3.2 Run `npm test` and confirm the `setOrder` cases still pass.
- [x] 3.3 Smoke `/seat` at 390 and 1440 pixels in a real browser: one row of
  actions under the ring at desktop, wrapped rows at 390, no console error, and
  the use action saves the displayed order and keeps the current destination.

## 4. Integration

- [x] 4.1 Run `npm run verify`, `node scripts/openspec-check.mjs` and
  `openspec validate --changes --strict`; record the results under Evidence.
- [x] 4.2 Confirm `openspec/specs/app/ui-shell/spec.md` needs no edit before
  archive; the delta is applied after the merge.

## Evidence

- RED: `node scripts/browser-check.mjs` stopped at the first new seat check:
  `AssertionError [ERR_ASSERTION]: the left rail keeps no action block`,
  `1 !== 0`, `scripts/browser-check.mjs:1768`, exit 1.
- GREEN: `node scripts/browser-check.mjs` passed the full suite (exit 0), and
  `npm run verify` exited 0. `npm test` passed 480 tests. `npm run typecheck`,
  `npm run lint` and `npm run format:check` passed.
  `openspec validate --changes --strict` passed for 5 changes.
  `node scripts/openspec-check.mjs` passed: 19 specs, 5 active changes.
  Issue #154 was created for this change and linked from `proposal.md` and the
  delta spec.
- Smoke: `/seat` at 1440 shows the four actions in one row under the ring; at
  390 they wrap to two rows, every control is 44 px high, the page has no
  horizontal overflow, the left rail has no action block, one player control
  remains and no in-screen control links to `/secrets`. The saved order and
  `player.seat` values matched the displayed order after the use action.

## Workflow follow-up

- Commit, push the branch and open the pull request; never merge it.
- After the owner merges, archive the change once `npm test`,
  `node scripts/openspec-check.mjs` and `openspec validate --specs --strict`
  pass, then remove the worktree and delete the local branch.
