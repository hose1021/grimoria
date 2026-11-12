# Design

## Context

See `proposal.md` for motivation and `specs/` for the required behaviour. This
document covers the implementation approach.

Current state, verified in the repository:

- React 19, Tailwind CSS v4 through `@tailwindcss/vite`, Radix Dialog and Label.
  No component library, no `clsx`, no CSS-in-JS.
- `index.html` loads `css/app.css`, `css/bag.css`, `css/seat.css` and
  `css/setup.css`. Tailwind Preflight is disabled because the legacy stylesheets
  are unlayered and would be reset.
- The shell (`src/ui/shell.tsx`) routes `/table`, `/bag`, `/seat`, `/secrets`,
  `/player`, `/public` and `/sheet` to native screens. `/help` and `/demo` still
  mount through `LegacyBridge` and render from string composition.
- The console (`src/ui/screens/table/`) has a header with nine controls, a seat
  rail, a side panel and a phone dock. Derived facts come from read models; the
  screen never calls the engine.
- Tokens live in `css/app.css` `:root` and mirror into
  `src/ui/styles/tokens.css` `@theme`. `scripts/check-types-policy.mjs` enforces
  the mirror and rejects any theme token missing from `TOKEN_MAP`.
- `scripts/browser-check.mjs` drives the built artifact and reads legacy class
  hooks such as `.host-card`, `.seat-item`, `.bag-role` and `.setup`.
- The owner-selected visual contract is
  `design/prototypes/03-arcane-instrument-full.html`. It is a static prototype;
  this design keeps its composition and states, not its fixtures.

Constraints: offline-first PWA with no CDN, no new runtime dependency, 44 px
controls, no horizontal overflow at 360 and 390 px, reduced-motion support,
unchanged commands, schema, storage keys, routes and privacy projections.

## Goals / Non-Goals

**Goals:**

- One visual language on every route, with the three-zone console at desktop and
  a table-first stack on phones.
- A presentational component layer that the screens compose, so the console,
  setup, player, public and sheet screens share tokens and states.
- Replace the setup stylesheets with utilities and delete them.
- Keep every behavioural contract: commands, drafts, focus, timers, privacy,
  routing and the browser checks' assertions.
- Make the manual bag picker show the selected script's roles grouped by team,
  with no search, edition or team filters.

**Non-Goals:**

- No engine, schema, storage, command or route change.
- No new dependency, no shadcn/ui, no icon package, no web font.
- No light theme. The owner requires a dark table aid in a dim room.
- No redesign of the three rejected directions; `01`, `02` and `04` stay as
  reference prototypes only.
- No public/multiplayer features, no animation system, no canvas rendering.

## Decisions

### 1. Token source stays single, with a new Arcane layer

`css/app.css` `:root` remains the source of values; `src/ui/styles/tokens.css`
mirrors them into the Tailwind theme. The Arcane tokens are added to both sides
and to `TOKEN_MAP` in the same commit. `css/app.css` keeps only the font face,
body base, focus ring, global banners (`storage-status`, `update-banner`,
`offline-status`) and `.btn`/`.field`/`.label` while the legacy screens exist;
those primitives retire with the last legacy route.

Alternative considered: a second `arcane.css` theme imported only by new screens.
Rejected because the repository already forbids a second palette, the check
would need a second map, and the offline worker would ship both.

### 2. Token names and values

The source names below are added to `css/app.css`; the theme names are the
`--color-*` (or `--radius-*` / `--shadow-*`) twins in `tokens.css`.

| Source | Value | Role |
| --- | --- | --- |
| `--crypt` | `#080b0e` | page void |
| `--crypt-2` | `#0f141a` | panel |
| `--crypt-3` | `#141b23` | raised panel, hover |
| `--edge` | `#243039` | hairline border |
| `--edge-2` | `#37464f` | strong border, focus outline |
| `--brass` | `#b08d57` | secondary metal, eyebrow labels |
| `--amber` | `#e6a94c` | primary action, active actor |
| `--amber-2` | `#f0c072` | primary hover, emphasis |
| `--amber-dim` | `#6a4d22` | primary border, muted active |
| `--crimson` | `#c04a42` | danger action, death mark |
| `--crimson-dim` | `#5d2320` | danger border and surface |
| `--parchment` | `#e8dcc0` | role and rules surface |
| `--parchment-2` | `#dccdaa` | parchment edge and hover |
| `--ink` | `#2b2118` | text on parchment |
| `--ink-2` | `#5c4a37` | secondary text on parchment |
| `--wax` | `#8f2f2a` | wax seal, dead mark on parchment |
| `--shadow-deep` | `0 24px 60px rgba(0,0,0,.55)` | dialog and card elevation |
| `--shadow-glow` | `0 0 24px rgba(230,169,76,.30)` | active actor only |
| `--radius-sm` | `4px` | buttons, inputs, chips |
| `--radius-md` | `6px` | panels, dialogs |

Existing `--text`, `--muted`, `--danger`, `--font-role` and the five team colours
stay as they are; they already pass contrast and carry rule meaning. Existing
`--radius` (10 px) and the legacy surface names (`--bg`, `--panel`, `--panel-2`,
`--line`, `--line-2`, `--accent`, `--accent-dim`, ...) retire at cutover, and
their `TOKEN_MAP` entries are removed with them.

`--shadow-deep` and `--shadow-glow` are declared in the source and mirrored as
theme shadows; the check treats them like any other mapped token.

### 3. Component layer is presentational and ports-free

New components live in `src/ui/components/arcane/` and take plain props. They
import no store, port or engine module. Screens own commands, drafts and
subscriptions, as they do today.

| Component | Props (shape) | Notes |
| --- | --- | --- |
| `ActionButton` | `variant: "forge" \| "crimson" \| "steel" \| "ghost"`, `size`, `disabledReason`, children | one primary per panel; `disabledReason` becomes `title` and `aria-describedby` |
| `PlayerToken` | `seat`, `name`, `role`, `image`, `alive`, `votes`, `effects[]`, `active`, `selected`, `deadVote`, `onSelect` | dead uses a mark and strike; effects are labelled marks; 44 px minimum |
| `RoleCard` | `role`, `image`, `mode: "hidden" \| "revealed" \| "compact"`, `reminders[]`, `effects[]`, `footer` | hidden renders the sigil and no role data |
| `PhasePanel` | `phase`, `kicker`, `title`, `actor`, `progress`, `actions`, children | shared by day and night |
| `EventLog` | `entries[]`, `activeFilter`, `onFilter` | time, title, detail, tag, tone |
| `GrimoirePanel` | `groups[]`, `reminders[]`, `rules[]` | used by the sheet and the secrets summary |
| `GameTable` | `players[]`, `phase`, `center`, `view`, `onSelect`, `dock` | centre zone of the console |

Alternative considered: binding components to ports. Rejected because the same
components must render the sheet, the player handoff and static prototypes, and
ports-free components are directly testable.

### 4. Console composition

The console becomes a CSS grid: `290px minmax(0,1fr) 330px` from 1240 px up,
`260px minmax(0,1fr)` between 860 and 1239 px with the log below, one column
below 860 px with the table first. The top bar keeps the brand, the route
navigation and the live clock. The centre holds the ring table, a phase header
and the dock. The left zone renders the active `PhasePanel`; the right zone
renders `EventLog` plus the notes, timer and backup controls in a tools group.

The table is a circular CSS composition, not a canvas or a grid: a radial
background, two engraved rings and absolutely positioned tokens. Tokens are
placed with an inline `left`/`top` percentage computed from the seat angle and a
radius that scales with the ring (`min(64vh, 560px)` desktop, `min(92vw, 420px)`
phone). The seat count sets the radius: 8 seats use the full radius, 11 or more
use a tighter radius and smaller discs, and the phone dense view may switch to a
three-column grid. The prototype's geometry is the reference; the implementation
must be re-measured with 5, 8, 11 and 15 seats.

Day and night share `PhasePanel`: day exposes the nomination, threshold and
execution; night exposes the actor, target choice, progress and resolve. The
existing handlers and read models are reused; the redesign does not move logic
into components.

### 5. Manual bag groups by team

The manual picker renders every role of `state.script.roles` grouped by team in
the order Townsfolk, Outsider, Minion, Demon, each group with a heading and a
count. The search, edition and team filter state is deleted with the controls it
served. Selection, undo, repair, the library and the deal command stay. Clicking
a group heading does nothing; the group is a section, not a filter.

Alternative considered: keeping the filters as progressive disclosure. Rejected
because the script already bounds the pool, and the owner asked for the grouped
list instead.

### 6. Sheet grouping is the existing behaviour, restyled

`/sheet` already renders team sections with a dot, a heading and a count. The
migration keeps that structure and replaces the card chrome with `RoleCard`
compact mode. The scenario filter and the Travellers toggle stay.

### 7. No new dependency

Radix Dialog and Label already cover focus trapping, Escape and labelling. The
components use plain Tailwind utilities and a local `cx(...classes)` join helper
(no `clsx`). shadcn/ui is not copied in because the repository would then carry
two component conventions and a second token vocabulary.

### 8. Cutover order and the global reset

Phases 1 to 4 migrate routes while the legacy stylesheets still load. Phase 5
migrates `/help` and `/demo`, enables Preflight and the shell reset, deletes the
three stylesheets and their links. Phase 6 removes the legacy tokens. Any phase
can be reverted independently; the reset lands only after the last legacy rule
is gone.

Legacy class names that `scripts/browser-check.mjs` reads stay on the elements
as inert hooks (`.setup`, `.bag-role.is-on`, `.seat-item`, `.host-card`). The
checks' behavioural assertions stay; selectors that read a deleted rule are
updated in the same commit that deletes it.

## Risks / Trade-offs

- Browser-check selector churn → keep the hooks listed above and change
  selectors only with the matching stylesheet deletion; run the suite before and
  after that commit.
- Preflight changes help/demo layout → migrate those screens first in phase 5,
  keep a screenshot of the pre-reset computed styles, and compare.
- Token map drift → add each source/theme/map entry in one commit; the check
  fails fast with the token name.
- Ring overlap on phones and at 15 seats → compute the radius from the seat
  count, measure with 5, 8, 11 and 15 seats at 360 and 390 px, and fall back to
  the dense grid when the token labels collide.
- Manual list is long without filters → group headings with counts and a
  three-column grid at desktop; the list starts with the selected roles above
  it, so the current bag is always visible.
- Parchment contrast on role cards → use `--ink` on `--parchment`, never muted
  grey; verify AA on the card, the ability and the reminder.
- Static prototype diverge → the prototype is the visual reference, not the
  test oracle; the browser checks and the specs are the oracle.
- The pending `feat/setup-overhaul` work conflicts with this change → this
  change targets `origin/main`; the setup overhaul's CSS deletion is superseded,
  and its behaviour tests are folded into the bag/seat/secrets tasks.
- Issue link is not created yet → the owner links the GitHub issue before the
  apply workflow starts, per the repository workflow.

## Interaction revision

- The table is the only target control. Seat tokens carry `data-target` and
  `data-id`, select or deselect the current night step's targets, and show the
  selected state. The night card shows the prompt and the chosen names, not
  duplicate target buttons. The side panels are informational: step hints,
  progress, the log, notes and backups.
- The ring core shows the active role, the night number, the step progress, the
  chose-target prompt and a chosen-target chip. The active actor carries
  "Действует"; the selected target carries "Цель", the gold edge, the dark amber
  hex fill and a shape-following glow.
- The app bar uses one active-route outline, the nominative player label and a
  segmented RU/AZ/EN switch. The fixed footer dock and the offline-ready block
  are removed.
- Bag secret-role tokens are interactive; the manual order stays in script
  order; the selected/required counts and deltas sit at the team headings. The
  secrets engine keeps the chosen information role and the red herring sits
  beside the pairs. A 15-player demo seeds generated names.

## Migration Plan

1. Tokens and primitives: add the Arcane tokens, the token map entries, the
   component files and their focus/disabled states. The app still renders the
   old screens.
2. Shell and console: adopt the new top bar and the three-zone grid; render the
   day and night panels and the token ring; keep the existing actions.
3. Bag: presets, random and the grouped manual picker; remove the search and
   filter controls and their state.
4. Seats and secrets: restyle the ring, the order list and the secrets forms.
5. Player, public and sheet: restyle the handoff card, the public projection
   and the team-grouped sheet.
6. Help and demo: restyle the two DOM screens, enable the reset, delete
   `css/bag.css`, `css/seat.css`, `css/setup.css` and their links.
7. Cleanup: remove the legacy tokens and map entries, update `SPEC.md`,
   `docs/architecture.md` and add `docs/design-direction.md`, then run
   `npm run verify` and the browser checks at 1440, 390 and 360.

Rollback: revert the phase commit. Phases 1 to 5 keep the old CSS loaded, so a
revert restores the previous look without touching data or routes. Phase 6 adds
the deleted files back by reverting its commit; no saved game changes.

## Open Questions

None that change the specs, the approach or the task breakdown. The GitHub issue
number is a process input owned by the owner, not a design unknown.
