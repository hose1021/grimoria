# Design direction: Arcane Instrument

Grimoria is a dark fantasy table aid used by one Storyteller in a dim room. The
interface must read as a tabletop instrument, not a dashboard: the table is the
centre, the host controls sit beside it, and the record of play sits opposite.

The reference composition is `design/prototypes/03-arcane-instrument-full.html`.

## Materials and palette

| Role | Token | Value |
| --- | --- | --- |
| Page void | `--color-crypt` | `#080b0e` |
| Panel | `--color-crypt-2` | `#0f141a` |
| Raised panel, hover | `--color-crypt-3` | `#141b23` |
| Hairline | `--color-edge` | `#243039` |
| Strong border, focus | `--color-edge-2` | `#37464f` |
| Secondary metal | `--color-brass` | `#b08d57` |
| Primary action, active actor | `--color-amber` | `#e6a94c` |
| Primary hover | `--color-amber-2` | `#f0c072` |
| Primary border | `--color-amber-dim` | `#6a4d22` |
| Danger, death | `--color-crimson` | `#c04a42` |
| Danger border | `--color-crimson-dim` | `#5d2320` |
| Role and rules surface | `--color-parchment` | `#e8dcc0` |
| Text on parchment | `--color-ink` | `#2b2118` |
| Wax seal | `--color-wax` | `#8f2f2a` |
| Elevation | `--shadow-deep` | `0 24px 60px rgba(0,0,0,.55)` |
| Active glow | `--shadow-glow` | `0 0 24px rgba(230,169,76,.30)` |

Team colours stay as rule data: `townsfolk`, `outsider`, `minion`, `demon`,
`traveller`. They mark teams, never actions.

One glow per view. A card does not glow. A phase panel and a dialog do not use a
multi-colour gradient.

## Typography and shape

- Display: `--font-role` (Georgia stack) for phase titles, role names and
  section headings.
- Interface: Inter for labels, data and controls; tabular numerals for counts,
  timers and vote tallies.
- Labels: uppercase, 8 to 10 px, letter spacing .12 to .2 em, brass.
- Radii: 4 px for controls and chips, 6 px for panels and dialogs. No pills.
- Borders: one hairline; the left team edge is 2 to 3 px and always paired with
  a team label.

## Composition

Desktop: `320px | table | 330px` from 1200 px; the table is the widest zone.
Tablet: two columns, the log moves below. Phone: the table first, then the phase
panel and the log; the route dock stays fixed at the bottom.

The table is a circle: tokens sit on the rim, the phase and the progress sit in
the centre. Eight seats use the full radius; 11 and more pull the tokens closer
to the rim. The phone uses smaller tokens and may fall back to a dense grid when
labels collide.

## The two-second read

At a glance the console must answer: which phase and day, who is alive, who is
dead, who has votes, who is poisoned or protected, who acts now, and what the
single next action is. The phase panel carries exactly one primary action.

## Component vocabulary

`ActionButton` (forge, crimson, steel, ghost), `PlayerToken`, `RoleCard`
(hidden, revealed, compact), `PhasePanel`, `EventLog`, `GrimoirePanel`,
`GameTable`. Components take plain props and never read the store or the engine.

## Motion

State feedback only, 180 ms or less. No entrance choreography. The active actor
uses a static amber ring and a single glow. `prefers-reduced-motion: reduce`
removes animation and smooth scrolling.

## Accessibility

- Text contrast meets AA; parchment uses ink, never muted grey.
- Every control is at least 44x44 px and keyboard reachable, with a visible
  amber focus ring.
- Dead seats use a mark and a strike in addition to muted colour.
- Dialogs keep their Radix focus trap, Escape handling and accessible name.
- Hidden player and public projections carry no real role, reminder or effect.
