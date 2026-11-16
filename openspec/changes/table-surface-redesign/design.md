# Design

## Context

See `proposal.md`. `/table` is one screen: the shared Arcane app bar, a
scrollable stage holding `TableRing` (rail, felt, hub, seats), and the fixed
`TableDock`. The stage box previously carried an ellipse; its geometry was
percentage-only and never read the DOM. The owner now requires a measured
racetrack contour, equal perimeter spacing and orientation by width.

The dock content belongs to `table-dock-trim` (already in `main`); this change
restyles containers and controls and leaves those readings alone. The palette
is shared: the table tokens alias the global semantic tokens, so the same
obsidian materials reach every route without a per-screen copy.

## Goals / Non-Goals

**Goals:**

- One stadium contour shared by the rail, the felt and every seat centre.
- Equal arc spacing for five to fifteen players, recalculated on resize.
- No fixed bottom seat; no medallion or label outside the box.
- Phone: vertical stadium. Desktop: horizontal stadium.
- One semantic Obsidian & Antique Gold palette for every route, with the table
  consuming it through aliases.
- Squared, colour-coded controls.

**Non-Goals:**

- Engine rules, commands, projections, routes, storage keys.
- Changing the composition or layout of other screens; only their palette.
- Poker semantics (pot, chips, balance, community cards).
- A zero-radius control system; the table radius stays 4 px, not the
  reference's pills.

## Decisions

**One measured contour, maths not SVG.** `tableLayout(count, width, height)` in
`ring.ts` returns the stadium bounds in pixels and the seat centres in percent.
The contour is built from two straight segments and two semicircular caps; a
seat at distance `t` is found by walking those segments, so spacing is equal by
arc length. A unit test on a circular contour proves equal chord spacing.
Alternative considered: an SVG path with `getPointAtLength`. Rejected because
the same numbers must also size the HTML rail and felt; one maths function
returns both, and the DOM stays semantic buttons. The box is measured with a
`ResizeObserver` and `getBoundingClientRect`, so no per-seat top/left is ever
hand-written.

**Orientation follows the measured box.** A tall box (`height >= width`) gives a
vertical stadium; a wide box gives a horizontal one. The phone box is
`aspect-[100/135]`; the desktop box is `aspect-[1.42]` with the width cap
removed (`max-w-none`) so it can reach `52dvh * 1.42`. The old fixed 560 px cap
was overriding the calculated width and left the desktop table half empty.

**Insets reserve the medallion and its label.** The contour sits 34 px from the
side edges and 52 px from the top and bottom. That leaves enough room for the
medallion (22/29 px radius) and for an above/below label outside the rail. The
same insets drive the rail's position, so the seats sit on the rail's outline.

**Labels follow the outward normal.** A seat whose normal is mostly horizontal
puts its label inward (toward the hub); a seat whose normal is mostly vertical
puts it outward, above or below the medallion. This keeps side labels on the
felt and cap labels in the reserved margin, and it avoids the ellipse's old
bottom-cap label collision. Labels stay flat blocks (name, vote count, badge
row), never rotated.

**Rail and surface are two nested pills.** The rail is a div at the contour
bounds with `rounded-full` (a large radius clamps to a stadium) and a 6 px
gradient edge; the felt is an inset `rounded-full` child with one radial felt
gradient and a single static centre glow. Both share the contour because both
are driven by `layout.bounds`. Alternative considered: a border on one div;
rejected because a gradient rail needs its own box and the surface needs its own
overflow.

**One semantic palette, table tokens alias it.** The `@theme` block carries the
owner's full palette: `--color-crypt` #0B0F14 (page), `--color-crypt-2` #141B23
(panel), `--color-crypt-3` #202C38 (raised), `--color-edge` #364654,
`--color-text` #F0F3F5, `--color-muted` #A9B9C8, `--color-amber` #45B8A9
(primary) and `--color-amber-2` #60D2BF (hover/focus), `--color-brass` #E2AE65
(gold), `--color-success` #74C69D and `--color-danger`/`--color-crimson` #EF7779.
The table tokens (`table-rim`, `table-chip`, `table-muted`, `felt-day`,
`table-primary`, `table-primary-ink`, `table-secondary`, `table-danger`) alias
those values, so a palette change updates every route once. The success token
replaces the Outsider team green on the setup and secrets completion lines.
`--color-table-field` and the night felt tone stay gone: the stage and the dock
show the page, and the rail and felt fade to `--color-crypt`. The table keeps
the one felt `radial-gradient(ellipse at 50% 38%, var(--color-felt-day),
var(--color-crypt) 72%)`.

**Dock restyle reuses the `.btn` primitive.** Flat turquoise primary, neutral
chip secondary with light text, soft red danger with obsidian ink; gold is
reserved for the phase and accent numbers. 48 px action rows; utility controls
on the chip surface; 4 px corners; no pill class on a table control.

**Screen pass: one component standard, one decision per window.** The bag
recommended cards drop the inline role strip (the preview panel holds the
detail) and keep two 44 px actions; the apply button is neutral for every set
except the bag already in play, which carries the only accent. The secrets
reminders become a two-column card grid with role art, name and tokens; the
readiness checklist keeps its one primary. The player seat picker paints an
occupied seat with a solid edge, a muted number, the player name and an
explicit `Занято` line, while an open seat keeps the bright text and the
turquoise hover. The seat circle grows to `min(760px, 72vh)`, drops the second
seat number from the medallion and hides the duplicate order list on a phone.
The step sheet merges the acting role and actor into one header with the acting
pill and the ability once, and shows the chosen target only when one exists;
the engine checks, blockers and logging stay untouched.

**Acceptance is a unit test plus the browser harness.** The pure layout is
tested in `helpers.test.ts` (equal arc spacing, box fit, no bottom centre).
`browser-check.ts` asserts one rail, one felt gradient with a glow, squared
controls, the hub hero, no overlapping medallions and no bottom-centre seat at
1440, 390 and 360.

## Risks / Trade-offs

- **Fifteen labels on a narrow phone** → insets and outward/inward label sides
  are fixed; the 390 px and 360 px checks keep all names and medallions apart,
  and the phone aspect is reduced to 135 so the ring fits the stage at 390.
- **A tall dock at short viewports shrinks the stage** → the stage still
  scrolls when the table box needs more height than it has; the table box and
  labels stay inside their own bounds, with no horizontal overflow.
- **Observer timing** → the first render has no seats until the layout effect
  measures; the effect runs before paint, so the browser never shows a partial
  static ring.
- **Lower contrast on a darker felt** → the rail uses the lightened rim token,
  names use the text token and secondary text uses `--color-table-muted`; the
  browser check keeps the text-badge assertions.
- **The palette reaches every route at once** → the shared tokens change once
  and the table aliases them; the browser check walks the setup, bag, seat,
  secrets, night, day, result and review screens and each language, so a route
  that loses contrast or a token fails the run.
- **Danger red is softer than before** → #EF7779 sits on a dark red translucent
  background for copy and uses obsidian ink on a filled danger button, keeping
  the ratio above 4.5.
- **`table-dock-trim` overlap** → this change does not modify the dock's
  content, only containers and buttons, so both deltas archive independently.

## Open Questions

None.
