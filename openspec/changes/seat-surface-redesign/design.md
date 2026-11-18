# Design

## Context

See `proposal.md`. `/seat` is a native shell screen with a three-column frame:
a left rail (title, name list), a square ring of amber hexagons with an
angle-based radius, and a right tips column. `/table` (merged from
`table-surface-redesign`) is one measured stadium: `tableLayout()` in
`src/ui/screens/table/ring.ts` splits the measured box into the rail/felt bounds
and equal-arc seat centres; `TableRing` renders the rail, the felt, the seats and
the hub. Both screens share the app bar, the obsidian palette and the `.btn`
primitive (4 px radius).

`scripts/browser-check.ts` binds `/seat` through `.seat-item`, `.seat-name`,
`#seat-ring`, `.seat-actions`, `.seat-status`, `.seat-title > span`, a
four-button dock and a one-player-link assertion scoped to `#screen main`.

## Goals / Non-Goals

**Goals:**

- One table contour, one rail/felt and one label-side rule for both screens,
  from shared code rather than a copy.
- The seat screen keeps its draft behavior byte for byte: click pairing, drag,
  shuffle, undo, Escape cancel, publish-keeps-draft, commit.
- The existing browser-check hooks and behavioral assertions keep passing; only
  the player-link scope and the new visual assertions change.

**Non-Goals:**

- Moving `tableLayout()` or the table state helpers into a new domain module.
- Giving `/seat` a night surface, vote badges, role artwork or a table menu.
- Updating `scripts/fixtures/computed-styles.json` or the parity tool.
- Touching `/bag`, `/secrets`, `/table` behavior or any token value.

## Decisions

**Share the measured stadium instead of copying it.** Extract two pieces from
`TableRing` into `src/ui/screens/table/surface.tsx`: `useTableLayout(count)`,
which owns the ref, the `ResizeObserver`, the last non-zero box and the
`tableLayout()` call, and `TableFelt`, which renders the rail and the felt from a
`TableLayout`. `TableRing` keeps its seat/hub markup and passes `layout` in.
Alternative considered: write a second observer in `seat.tsx`; rejected because
the contour, the inset constants and the fallback box would drift, and a visual
standard with two copies is not a standard.

**The seat screen imports the table geometry.** `SeatScreen` renders the same
table box classes as `TableRing`, gets `{ ref, layout }` from `useTableLayout`,
and places seat `index` at `layout.seats[index]`. The `SIDE` map moves from
`ring.tsx` to `ring.ts` as an exported `SEAT_LABEL_SIDE`, so the label side rule
is also single-sourced. Alternative considered: keep the angle-based square
ring; rejected because the seats would leave the stadium rail.

**Names-only medallions keep the table shape.** Each seat button is the
medallion box: `size-11` at phone and `58px` from 620 px, `rounded-full`,
`bg-table-chip`, bordered with `table-rim`, showing the player initial in the
display serif. A picked seat or a drag target gets the `table-primary` outline
the table uses for a selected target; the amber hexagon and its clip path are
removed. The seat-number chip follows the table (`hidden` below 620 px). Seat 1
keeps its squared `Start` mark on the medallion edge so the label stays one
line. The label block is the table's: the name, `pointer-events-none`, placed by
`SEAT_LABEL_SIDE[side]`.
Alternative considered: keep the name under the medallion at every width;
rejected because it abandons the table's inward label placement and its proven
fifteen-name fit.

**The hub is the table hub with count data.** Small-caps label, the player count
as the hero numeral in the display serif with tabular digits, and the dead count
as the secondary line. No dot row: the table's dots mirror a vote threshold, and
`/seat` has no threshold to mirror. Alternative considered: a dot per player;
rejected because it restates the numeral without new information.

**The dock is the table dock with four actions.** A `footer` with the table's
container classes (`border-t border-edge bg-crypt-2`, bottom shadow, safe-area
padding), one row that starts with the `.seat-title` chip (`Seat order`) so the
existing language-switch assertion still finds `.seat-title > span`, the status
line as `.seat-status` with the exact current strings, and `.seat-actions` with
four `.btn` controls. `Use this order` carries the table primary fill
(`!border-table-primary !bg-table-primary !bg-none !text-table-primary-ink`);
`Player` stays an outline link; `Undo` and `Shuffle` use the quiet treatment with
the table's flat disabled style. No new button component. Alternative: keep the
in-flow bar; rejected because the fixed dock is part of the composition the
proposal matches.

**Empty state stays a card.** With no draft there is no ring and no dock: the
app bar plus a centered card with the bag link, inside the same `h-dvh` frame.
No second layout.

**Browser checks move one selector and gain surface assertions.** The player
link leaves `main` for the dock, so `#screen main a[href$="/player"]` becomes
`.seat-actions a[href$="/player"]` and the secrets parallel becomes
`.seat-actions a[href$="/secrets"]`; the counts stay 1 and 0, and the app-bar
links cannot satisfy them.
New assertions: one `[data-table-rail]` and one `[data-table-felt]` inside
`#seat-ring`; the medallion's computed radius is at least half its height and
its clip path is `none`; fifteen `.seat-name` nodes are visible at 390 px. The
existing drag, swap, shuffle, undo, language, commit and 44 px dock-height
assertions stay unchanged.

**No token changes.** The seat surface reads `table-rim`, `table-chip`,
`felt-day`, `table-primary`, `table-primary-ink`, `table-secondary`,
`table-muted` and `crypt-2`, all declared today. `/seat` is not a phase, so the
felt publishes `data-phase="seat"` and the shared `TableFelt` types its phase
prop as the table's phase plus `"seat"`.

## Risks / Trade-offs

- **Archive order.** `table-surface-redesign` is merged but still unarchived; its
  delta says the table composition applies to `/table` only. If it archives
  after this change, it overwrites the widened scope. → Archive
  `table-surface-redesign` first; this change's `app/table-console` delta already
  carries the merged wording plus the `/seat` scope.
- **Fifteen labels at 390 px.** The label placement and sizes are the table's,
  and the table already proves fifteen visible names at 360–390 px. → Add the
  same count assertion for `/seat`.
- **Smaller drag targets.** Labels become `pointer-events-none`, so a drag must
  end on a medallion. The medallion stays a 44 px control and the browser drag
  targets the button box centre. → Keep the drag assertions; do not route drag
  through the label.
- **The player-link assertion fails during the change.** Moving the action into
  the dock breaks `#screen main a[...]`. → Update that assertion in the same
  RED step and keep both counts.
- **Seat numbers disappear at phone width.** The number chip is hidden below
  620 px as on `/table`; order is carried by the start mark and the clockwise
  medallions. → The number returns from 620 px; the draft task does not depend on
  it.
- **Stale computed-style fixture.** `scripts/fixtures/computed-styles.json`
  predates the merged table redesign, and the parity script is neither in
  `npm run verify` nor in CI. → Out of scope; the `app/ui-shell` delta scopes the
  pre-migration baseline to `/bag` and `/secrets`.

## Migration Plan

No stored data, route or command changes. Deploy is the normal static build.
Rollback is reverting the UI commit; no save migration is needed.

## Open Questions

None.
