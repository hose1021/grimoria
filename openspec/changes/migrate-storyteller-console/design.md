# Design

## Context

The shell already owns the route table (`src/ui/shell.tsx`): native screens for
`/sheet`, `/player`, `/bag`, `/seat`, `/secrets` and `/public`, and
`LegacyBridge` for everything else. `/table` still goes through the bridge with
`writer` and `covered`; `src/entry/main.ts` maps it to `js/table.js`.

The legacy console is `js/table.js` (1822 lines: 50 markup functions, one
`render()` that replaces `innerHTML`, module-level draft state, five delegated
listeners, an Escape listener and a 1-second interval) plus
`js/table-dialogs.js` (310 lines, seven overlay kinds: hide, info, grimoire,
role, correction, export, import) and `js/guidance.js` (45 lines, `guideFor`).
Its styles are `css/host.css` (768 lines, `host-*`) and `css/table.css` (574
lines, `tbl-*`, no consumer left in the tree).

Constraints that shape the approach:

- `src/ui` may import `core` and `application`, never `infrastructure`, `entry`
  or `js/` (policy scan). Screens already import `core/engine` helpers
  directly (`bag.tsx`, `secrets.tsx`).
- Shell ports today: `router`, `game`, `roles`, `writer`, `commands` (eight
  named setup commands), `presets`, `library`, `strings`, `locale`, `assets`,
  `prefs`, `legacy`.
- The store mutates the live state on success and publishes a new snapshot;
  `useGame` is `useSyncExternalStore` over that snapshot. Commands return
  `{ status: "allowed" | "rejected" | "requires-storyteller-choice" }`.
- Tailwind runs with `source(none)` plus `@source "../"` and `@source
  "../../../js/*.js"`; utilities from `src/ui` are generated. Legacy CSS is
  unlayered and outranks layered utilities, so a converted element must not
  keep a legacy class for a property the utility sets, and `!` is used where an
  unlayered global wins.

## Goals / Non-Goals

**Goals:**

- `/table` renders natively with the same host flow, commands, saved state and
  exports as the legacy console.
- The screen owns its drafts locally, reads the game through one subscription,
  and takes the writer lock before it mounts.
- `js/table.js`, `js/table-dialogs.js`, `css/host.css` and `css/table.css` are
  deleted; the console is Tailwind-only, and `/demo` and `/help` keep the
  primitives they still use.

**Non-Goals:**

- No engine, rule or command-payload change.
- No visual redesign: the layout, wording and controls match the legacy console.
- No migration of `/help` or `/demo`, and no Preflight (that is
  `retire-legacy-ui`).
- No change to the role sheet, setup screens, player handoff or public line.

## Decisions

**Screen split.** `src/ui/screens/table/` holds `index.tsx` (writer gate,
subscription, drafts, composition), `header.tsx`, `seat-rail.tsx`,
`side-panel.tsx`, `night-card.tsx`, `day-card.tsx`, `deal-card.tsx`,
`over-card.tsx`, `dialogs.tsx`, `guided.tsx` and `helpers.ts`. Rationale: the
legacy file has 50 markup functions, and the single-file `bag.tsx` (66 KB)
already drew review flags. Alternative: one `table.tsx` component file, rejected
for the review cost.

**Ports.** `ShellPorts.commands` gains `dispatch(command: CommandInput):
DispatchResult`, and a new `guidance: { for(step: NightStep): Guide }` port
wraps `guideFor`. Rationale: the screen must not import `js/`; moving guidance
into `src/data` would drag the legacy string table and role catalog with it.
Alternative: pass every helper as a prop, rejected as noise.

**Local state.** One `useTableDrafts` hook owns overlay, mobile panel, guided
preference, registrations, givens, redirects, the BMR draft maps, execution and
Slayer targets, the correction draft, the open role card, export/import text and
the armed new-game flag. Cards receive data and callbacks as props and keep no
state of their own. Alternative: a reducer, rejected while the transitions are a
handful of independent toggles.

**Result handling.** `afterResult` keeps its legacy contract: a rejected or
choice command shows `window.alert` with the errors and leaves the card
unchanged; an allowed command clears the step drafts. Inline error banners are a
later change, not a silent behavior change here.

**Overlays.** Hide, info and grimoire stay full-screen sections with
`role="dialog"` and `aria-modal="true"` (parity, scrolling grimoire). Role card,
correction, export and import use the shared `Dialog` component, which already
handles the focus trap, Escape, the return focus and `inert` background.
Escape still closes every overlay.

**Timer.** `timerEnd` lives in screen state; a 1-second interval started while
the day card is mounted rewrites the display and is cleared on unmount. The
interval never dispatches and never persists the deadline.

**Covered start.** `shell.tsx` passes `covered` to `TableScreen`, which starts
with the hide overlay exactly as the bridge did after `/player` or `/public`.

**Styles.** `index.html` drops `css/table.css` and `css/host.css`; both files are
deleted. `css/host.css` is not only the console: it holds the whole `.help-*`
and `.demo-*` layout (grids, image sizes and their `900 px` and `640 px` media
blocks) plus the shared primitives those screens use (`.host-alert`,
`.host-alert.is-error`, `.host-inline`, `.host-panel-head`, `.host-muted`,
`.host-log`). That whole section moves to `css/app.css` unchanged, so `/help`
and `/demo` keep their computed styles, and it leaves with those screens in
`retire-legacy-ui`.
`src/ui/components/handback-cover.tsx` stops using `host-cover` and
`host-cover-box` and takes the utility classes and tokens instead.

**Helpers and tests.** `helpers.ts` holds the pure view functions lifted from
the legacy module: `stepTitle`, `targetNames`, `causeText`, `headerCount`,
`currentPhaseLabel`, `timerText`, `displayName`, `roleOf`, `shownRoleOf`,
`applyGiven` and the correction defaults. `helpers.test.ts` covers `applyGiven`
for every information kind, the timer formatting and the correction default per
kind.

## Risks / Trade-offs

- **Computed-style parity.** The console is the most layout-sensitive screen.
  Mitigate with the same comparison used for `/sheet`, `/player` and the setup
  screens: capture `#screen` styles at 390 px and 1440 px before the switch and
  after it, and diff.
- **Writer lock order.** A table that mounts before the lock is ready can show
  stale data. The writer gate stays identical to the bridge's and a second-tab
  check proves the busy card.
- **Interval leak.** A timer surviving the route change fails the cleanup
  scenario; the browser check asserts the console timer stops after navigation.
- **`applyGiven` drift.** The given answer depends on the step's information
  kind (role choice, zero, pair). A wrong mapping silently changes what the host
  records, hence the unit tests before the UI lands.
- **Legacy primitives.** Deleting `host.css` without the five moved rules breaks
  `/demo` and `/help`; the harness compares their spacing.
- **Alert parity.** Keeping `window.alert` preserves behavior but blocks the
  page; it is accepted now and revisited with the dialog pass.
