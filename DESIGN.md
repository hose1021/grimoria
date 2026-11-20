# Design

<!-- Generated from the built world; the direction contract lives in
     .impeccable/surfaces/src-ui-screens-home-tsx.md -->

## World

The last video store. Grimoria rents out one evening's mystery: the live game is
the tape on the shelf, the roles are the boxes, the Storyteller is the clerk.
The interface is store furniture — shelves, spines, price labels, staff picks,
hazard tape, a membership card — not a dashboard.

Dark by scene: a shop at night, one lit shelf. Yellow is the single action.

## Color

Tokens live in `css/app.css` under `@theme`. Use the token, never a literal.

| Token | Value | Job |
|---|---|---|
| `--color-crypt` | `#0b0b0d` | page ground |
| `--color-crypt-2` | `#141418` | panels, dock, app bar |
| `--color-crypt-3` | `#1d1d23` | raised control, seat box |
| `--color-shelf` | `#16161b` | shelf surface |
| `--color-edge` | `#2e2e36` | hairline |
| `--color-edge-2` | `#46464f` | control border |
| `--color-text` | `#f2efe6` | bone print |
| `--color-muted` | `#a8a6a1` | secondary print |
| `--color-amber` | `#ffc93c` | rental yellow: the one action, active tab, live dot |
| `--color-amber-2` | `#ffd964` | yellow hover |
| `--color-crimson` | `#ff6b5e` | rent red: danger, death, damage |
| `--color-tape-blue` | `#3d7bff` | follow/continue, signal |
| `--color-tape-purple` | `#a06bff` | third script spine |
| `--color-label` | `#f4efe4` | price-label cream |
| `--color-ink` | `#141414` | print on cream and on yellow |

Team colors: townsfolk `#6fa8ff`, outsider `#7fd48d`, minion `#ffa14a`, demon
`#ff5c4d`, traveller `#b98cff`. They appear as tape spines, never as fills for
large surfaces.

Yellow carries exactly one action per viewport. Red marks loss. Blue marks the
path forward on the same task. Purple exists only to separate the third script.

## Type

| Voice | Face | Use |
|---|---|---|
| Display | Oswald (400–700, self-hosted, Cyrillic + Latin + `ə`) | headlines, tape titles, card titles, buttons, numerals in a tally |
| Prose | Golos Text (400–700, self-hosted, Cyrillic-first) | body, labels in forms, descriptions |
| System | PT Mono (400, self-hosted, Cyrillic + Latin-ext) | shelf labels, barcodes captions, status tags, step rails |

Rules:

- `font-marquee` / `font-role` resolve to Oswald. Headlines are uppercase;
  tape titles keep their case.
- `label-mono` is the one system-label class: 11 px, 0.1 em tracking, uppercase.
- Body measure stays under 62 ch on the welcome page and 70 ch elsewhere.
- Numerals are tabular where counts change (`tabular-nums`).

## Materials

Defined once in `css/app.css`, composed with utilities:

- `.tape-box` — rental case: near-black gradient, 1 px `#34343d` edge, inner top
  highlight, soft shelf shadow. The default container for a role, a script, a
  membership card and the player sleeve.
- `.tape-sticker` — cream price label with a black edge and mono type. Names a
  tape; never used for body copy.
- `.hazard` — diagonal yellow/black stripe. A 2 px rule above a closing band, a
  5 px strip on the table mat. Never behind text.
- `.barcode` — vertical bar strip. Small, decorative, `aria-hidden`.
- `.screen` — the table hub: black glass with a dim yellow border. All hub text
  is light on it.
- `.marquee` — the display type preset.
- `.rise` — the one entrance: 10 px lift, 420 ms, 40 ms stagger, visible by
  default; disabled under `prefers-reduced-motion`.

Spacing: 4 px base, 8/12/16/24/32 steps. More space above a heading than below.

## Layout

- App bar: brand block (mark, `GRIMORIA` in Oswald, `ПРОКАТ · <script>` in mono),
  route tabs at ≥1440 px, burger below. The active tab is a 3 px yellow
  underline; the bar never wraps.
- `/` welcome: two columns at ≥980 px — headline, lead, one yellow action,
  status ticker on the left; the shelf of six tapes, note, rewind sticker and
  membership card on the right. Staff picks follow, then two explanation blocks,
  a system-tag row, and a yellow closing band with a hazard rule.
- `/table`: the mat is a dark shelf with a hazard strip; seat boxes sit on the
  ring contour inside the mat; labels sit on black tape with the side flipped
  away from the edge. The hub is a `.screen` note. The dock holds the preview,
  the reason and the two action rows.
- `/player`: one cream-labelled sleeve per handoff, a 4-column seat grid, 44 px
  minimum targets.
- `/bag`, `/seat`, `/secrets`, `/sheet`, `/help`: shelf panels with mono labels;
  long reading stays on dark, cream is reserved for labels and the player card.

## State

- Selected target: yellow ring + 2 px outline on the seat box.
- Acting seat: yellow ring and a soft yellow glow.
- Nominated: red ring.
- Dead: grayscale art, 50% opacity, red strike on the name, `✕` over the box.
- Poisoned: diagonal hatch over the seat art.
- Applied bag: yellow left border and an `Применён` chip.
- Disabled: 40% opacity, no pointer; never a color-only signal.
- Focus: 2 px `--color-amber-2` outline, offset 2 px.

## Motion

One authored moment, the shelf lift, and the existing `player-reveal`. Nothing
else animates on scroll. All motion is suppressed under reduced motion.

## Accessibility

- Every interactive target is at least 44 × 44 px.
- Body text and placeholders stay at or above 4.5:1; large display text at 3:1.
- The seat button carries the seat number, name, role and badges in its label.
- The hazard and barcode elements are `aria-hidden`.
- The layout is verified at 390 px and 1440 px; tables and the dock reflow, not
  scroll horizontally.

## Do not

- Do not put yellow on two competing actions in one viewport.
- Do not wrap content in rounded cards; use a tape box or a shelf band.
- Do not use cream as a page ground; it is a label material.
- Do not set prose in PT Mono.
- Do not repeat an entrance animation on every section.
