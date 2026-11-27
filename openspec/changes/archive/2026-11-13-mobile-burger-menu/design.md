# Design

## Context

See `proposal.md` - Why, and `specs/app/ui-shell/spec.md` for the required
behaviour.

The app bar exists twice. `src/ui/components/arcane/app-bar.tsx` renders in
React on every native screen; `src/ui/components/arcane/app-bar-html.ts`
renders a string for `/help` and `/demo`, and `src/ui/i18n/translate.ts`
injects their language select into the first `header`. Both bars already share
`app-bar-parts.ts`: one route list and one set of class strings.

Every screen renders its own bar, so a route change mounts a new header.
Below 900 pixels the bar uses Tailwind's `max-sm` wrap and the route list
becomes a three-column grid under the brand.

## Goals / Non-Goals

**Goals:**

- One menu implementation for both bars, with no duplicated control.
- The same route list, Help and language control at every width; only the
  presentation changes.
- Keyboard and pointer behaviour that matches the disclosure pattern the
  shared dialog already uses: explicit open state, Escape, focus return.

**Non-Goals:**

- No restyling of the desktop bar beyond moving the same controls into one
  container.
- No focus trap and no `aria-modal`: the panel is a disclosure, not a dialog.
- No hamburger on `/public`, which renders no host navigation.
- No persisted menu preference.

## Decisions

### One panel element for both widths

The panel is always in the DOM. At 900 pixels and above it is a static row
(`min-[900px]:flex`) that contains the route links, Help and the language
switch. Below 900 it is an absolutely positioned block under the header and is
hidden unless the panel carries `data-open`:

```
max-[899px]:hidden max-[899px]:data-[open]:flex
```

The attribute selector outranks the plain hidden utility, so visibility is CSS
state and the controller never rewrites layout classes. One element means one
route list and one language control at every width.

Alternative considered: two copies of the controls, one for each mode. Rejected
because the language control keeps its own state in React and a `<select>` in
the string bar, so duplicates would drift and `#screen select` would no longer
name one element.

Alternative considered: Radix DropdownMenu. It is not installed (only Dialog
and Label are), the content is a navigation list rather than a menu widget, and
the disclosure pattern needs no roving focus.

### One delegated controller for both bars

New `src/ui/components/arcane/app-bar-menu.ts` exports
`initAppBarMenu(root, signal)` and returns a close function. It delegates on the
screen root, so a string bar that rewrites `innerHTML` keeps working, and it
reads:

- `[data-app-bar-toggle]`: click toggles `aria-expanded` and `data-open`.
- `[data-app-bar-menu]`: the panel, identified by `aria-controls="app-bar-menu"`.
- `keydown` Escape: close and focus the toggle.
- `pointerdown` outside the panel: close without moving focus.
- `click` on an anchor inside the panel: close.

The React bar binds it once in a `useEffect` and closes it when `current`
changes; the string screens call it in `mount` with their existing
`AbortController`. One implementation covers every bar.

Alternative considered: React state in `app-bar.tsx` plus a second copy of the
close logic in the string bar. Rejected because the two behaviours would drift,
and the string bars have no React owner.

### Panel placement and scrolling

The header becomes `relative` and the panel `absolute inset-x-0 top-full z-50`
below 900 pixels. It scrolls itself (`max-h-[calc(100dvh-3.5rem)]
overflow-y-auto`) so eight 44 px rows still work at 360x640 landscape. The
header keeps `sticky` and its `z-40`, and the panel inherits that stacking
context.

### Language select injection

`translate.ts` currently appends the select to the first `header`. It targets
`[data-app-bar-menu]` first and falls back to the header, so `/help` and `/demo`
put the select inside the panel like the React bar does.

### Menu label

A new `menu` key in `ru`, `en` and `az` labels the toggle. `aria-expanded`
carries the state; the label does not change between open and closed.

### Breakpoint

900 pixels matches the console's single-column breakpoint and the existing
`max-[900px]` usages. Tailwind's `sm` (640 px) is too narrow: seven links and
the language switch do not fit inline at 700-900 pixels either.

## Risks / Trade-offs

- **Existing browser steps click `.lang-switch` at 360 and 390 pixels** → those
  steps open the panel first, or run at 1440 where the switch stays inline.
  The language persistence assertions keep their current coverage.
- **The computed-style fixture records `#screen select` and `#screen a` at
  390x844** → re-record `scripts/fixtures/computed-styles.json` and review the
  diff; the moved select legitimately changes its box.
- **Arbitrary Tailwind variants must stay literal in source** → all class
  strings live in `app-bar-parts.ts`, where the scanner sees them.
- **The panel overlays content and can be taller than a landscape phone** →
  own scrolling and no page-width growth; the 360 px overflow check covers it.
- **Two headers on one page would duplicate `id="app-bar-menu"`** → only one
  screen renders at a time, and `/public` renders no panel.
- **A route activation can unmount the bar before the delegated close runs** →
  the destination screen mounts a closed panel; the scenario asserts that
  result, not an intermediate class.

## Migration Plan

Internal UI change with no data or route migration. Merge behind no flag; revert
the squashed commit to roll back. The change targets the app bar that
`arcane-instrument-ui` already landed, so it must merge after that change.
