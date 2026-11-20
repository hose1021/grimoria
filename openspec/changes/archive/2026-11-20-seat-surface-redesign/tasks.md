# Tasks

## 1. Failing checks first

- [x] 1.1 Update the seat section of `scripts/browser-check.ts`: scope the
      player-link assertions to `.seat-actions` instead of `#screen main` (count
      stays 1 for `/player` and 0 for `/secrets`), add one `[data-table-rail]`
      and one `[data-table-felt]` inside `#seat-ring`, assert each medallion's
      computed corner radius is at least half its height and its clip path is
      `none`, and count fifteen visible `.seat-name` nodes at 390 px. Verify:
      `node scripts/browser-check.ts` fails only on the new assertions and every
      existing seat assertion keeps its meaning.

## 2. Shared stadium surface

- [x] 2.1 Add `src/ui/screens/table/surface.tsx` with `useTableLayout(count)`
      (ref, `ResizeObserver`, last non-zero box, `tableLayout()`) and
      `TableFelt` (rail and felt from a `TableLayout`); move the label-side class
      map from `ring.tsx` to `ring.ts` as `SEAT_LABEL_SIDE` and refactor
      `TableRing` to use both. Verify: `npm run typecheck`,
      `node --test src/ui/screens/table/helpers.test.ts` and every `/table`
      browser assertion pass unchanged.

## 3. Seat screen

- [x] 3.1 Replace the three-column setup frame with the table composition: an
      `h-dvh` app-bar/stage/fixed-dock column, the empty state inside it, and no
      left rail or right tips column. Verify: `/seat` renders `#seat-ring` and
      the dock, `aside` count is 0, and the 360/390 px overflow checks pass.
- [x] 3.2 Place the seats with `tableLayout()` and `SEAT_LABEL_SIDE`; render
      round medallions with the player initial, the table primary pick/drag
      outline, the seat number from 620 px and the start mark on seat 1; restyle
      the drag ghost to the same medallion. Verify: the surface, medallion and
      fifteen-name assertions pass together with the drag, click-swap, shuffle,
      undo and Escape checks.
- [x] 3.3 Replace the hexagon hub with the table hub shape: small-caps label,
      player count as the hero numeral and the dead count line. Verify: the
      centre count assertion passes and the count equals the rendered seats.
- [x] 3.4 Restyle the bottom bar as the table dock: `.seat-title` chip in the
      first row, `.seat-status` line with the current strings, and four
      `.seat-actions .btn` controls with `Use this order` as the only primary.
      Verify: the four-button 44 px check, the one-player-link check, the
      disabled undo state and the status texts pass.
- [x] 3.5 Update the `/seat` description in `SPEC.md` to name the table
      composition and keep the names-only and draft claims. Verify: the text
      matches the delta specs and claims no behavior the browser checks do not
      exercise.

## 4. Integration

- [x] 4.1 Run `npm run verify` and record the result; a failure that reproduces
      on `origin/main` is reported with that proof.
- [x] 4.2 Run the app at `http://localhost:8010/`, exercise `/seat` at 1440x900
      and about 390 px with a fifteen-player game, capture screenshots, confirm
      a clean console and no horizontal overflow, and compare the surface with
      `/table`.
- [x] 4.3 Run `node scripts/openspec-check.ts`, `openspec validate --changes
  --strict` and `openspec validate --specs --strict`; report the result.
- [x] 4.4 Record the RED and GREEN command results in this change before it
      leaves review.

## Evidence

- RED: `node scripts/browser-check.ts` failed at `the seat ring renders the table rail` (`0 !== 1`) before the seat rewrite.
- GREEN: `node scripts/browser-check.ts` passed the full suite after the surface, seat and start-mark fixes (89 s).

## Workflow follow-up

- Issue #282 tracks this change; `proposal.md` names it.
- Archive `table-surface-redesign` first; its delta limits the table composition
  to `/table` and would overwrite the widened scope if archived later.
- Implement in a dedicated worktree from `origin/dev` on a `feat/` branch,
  commit, push and open the PR against `dev`; never merge it. Only a release PR
  (`dev` → `main`) targets `main`.
- Archive this change after the owner merges and the verification passes.
