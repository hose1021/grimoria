# Design

## Context

See `proposal.md` - Why, and `specs/app/ui-shell/spec.md` for the required
behaviour.

`src/ui/screens/seat.tsx` renders a three-column grid:
`[290px minmax(0,1fr) 330px]`. The left aside carries the title card, a
`section` titled "Actions" with five controls (player, secrets, undo, shuffle,
use) and the numbered seat list. The main column carries the ring and a footer
with the status line, a standalone player link and a "Next: secrets" link. The
right aside carries hints. The ring and the footer are sibling children of the
main column, so the footer is already the bottom of the table area.

`useOrder` dispatches `setOrder(draft.slice())` and navigates to `/secrets` when
roles are dealt and the phase is `seat`, otherwise to `/table`. The engine's
`setOrder` already writes the array unchanged and mirrors `player.seat` to each
position, so the exact-order guarantee needs no engine change.

## Goals / Non-Goals

**Goals:**

- One action location on the seat screen, under the ring.
- One player control and no in-screen secrets shortcut.
- The commit path stays the existing command and navigation.

**Non-Goals:**

- No change to the engine, command contracts, storage keys or routes.
- No header, right-rail or ring restyling.
- No new component abstraction: the existing `section` and `.btn` primitives
  move and reflow.

## Decisions

### Move the existing action block, do not rebuild it

The `seat-actions` grid moves from the left aside into the main footer. It keeps
the `data-act="undo"`, `data-act="shuffle"` and `data-act="use"` hooks the
browser checks use. The "Секреты" anchor is deleted, and the footer's standalone
player and secrets anchors are deleted; the moved block's player anchor becomes
the only player control.

Alternative considered: two action renderings, one per rail state. Rejected
because the draft, history and handler state already live in one component;
duplicates would drift.

### Bottom bar composition

The footer keeps `flex flex-wrap items-center gap-2` with the status line first.
The action group follows with `ml-auto flex flex-wrap justify-end gap-1.5`; below
900 pixels it drops the auto margin and takes the full row width. The `.btn`
primitive already enforces a 44 px minimum height, so no per-control override is
needed. The status line keeps `role="status"`.

Alternative considered: a fixed or sticky bar. Rejected because the main column
is a full-height flex column and the ring area already shrinks; a sticky bar
would cover seat labels on short viewports.

### Accessible group name instead of a visible heading

The visible "Actions" heading is removed because the bar sits under the ring and
a heading would consume the row. The group gets `role="group"` and
`aria-label={ports.strings.text("Actions")}`, so the "Actions" translation key
stays in use in all three catalogs.

### Remove the unused secrets label

`Next: secrets` is used only by the deleted footer anchor. Remove it from
`src/ui/i18n/translate.ts` in `ru`, `en` and `az`. The `secrets` key stays: the
app bar and the secrets screen still use it.

### Exact-order verification

The engine path is unchanged. The browser check records the displayed seat ids
and names before activating `[data-act="use"]`, then asserts that
`store.state.order` equals that id list, every `player.seat` equals its position
plus one, and the existing destination still renders. This is the only new
assertion the requirement needs; the engine's own rejection and reverse-order
cases already cover `setOrder`.

### Viewports

The seat screen already stacks to one column below 900 pixels and the main
column spans the full width. The new bar wraps within that column: the status
line can take its own line, and the four buttons flow into rows at 390 px. The
existing browser checks cover horizontal overflow on `/seat`; the new location
is inside the same column, so the current overflow guard still applies.

## Risks / Trade-offs

- **The visible action heading disappears** → the group label keeps the name for
  assistive technology; the buttons are self-describing.
- **Removing both secrets shortcuts leaves the app bar as the only explicit
  `/secrets` link** → `useOrder` still advances to `/secrets` when roles are
  dealt, and the app bar route is present at every width.
- **The action row can wrap into two rows at 390 px** → accepted; a single row of
  four 44 px controls does not fit, and the wrapped rows do not scroll
  horizontally.
- **A published state can arrive while the footer is focused** → the group is
  static after render; the draft is not replaced by a publish, so the focused
  control keeps its action.
- **The browser check selects `[data-act="undo"]` and `[data-act="use"]`** →
  both remain unique on the seat route and keep their current attributes.

## Migration Plan

Internal UI change with no data or route migration. Revert the squashed commit
to roll back.
