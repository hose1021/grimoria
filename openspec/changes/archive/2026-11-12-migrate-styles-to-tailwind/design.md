# Design

## Context

See `proposal.md` — Why.

Measured current state on `origin/main`:

- `css/app.css` (169 lines) holds the `:root` palette, the font face, the
  shared primitives (`.btn`, `.btn--accent`, `.btn--danger`, `.btn--quiet`,
  `.field`, `.label`, `.card`), the brand marks, the update/storage/offline
  banners and the global resets.
- `css/bag.css` (551), `css/seat.css` (290) and `css/setup.css` (608) style
  `/bag`, `/seat` and `/secrets`. A class census over `className` strings finds
  39 of 78 `bag-*` rules, 26 of 26 `seat-*` rules and 69 of 84 `setup-*`/
  `secrets-*`/`script-*` rules still referenced; the rest are dead.
- `src/ui/styles/shell.css` (27) imports Tailwind theme and utilities into
  explicit layers with `source(none)`, never Preflight. `tokens.css` (38)
  mirrors the `:root` values in one `@theme` block.
- `index.html` links the four root stylesheets; `src/ui/main.tsx` imports
  `shell.css`. Vite merges all of it into one CSS asset (observed:
  `dist/assets/index-*.css`, 66.1 KB, containing `bag-*` rules).
- `/sheet`, `/player`, `/public` and `/table` already use utilities and still
  use `.btn`, `.field`, `.label` and `.brand-*` from `app.css`. `/help` and
  `/demo` are DOM-string screens using the same primitives.
- `scripts/browser-check.mjs` selects the legacy class names directly:
  `.host` (36 references), `.bag-*` (40), `.seat-*` (22), `.script-*` (24),
  `.lang-switch` (6), `.sheet-page` (6), `.player-card` (6), `.setup-banner`
  (8), `.secrets-*` (3).
- `scripts/check-types-policy.mjs` enforces the mirror: `TOKEN_MAP` maps every
  `--color-*` in `tokens.css` to a `--…` in the `:root` block of `app.css`, and
  fails on a missing token, a changed value or an unmapped entry.
- 92 `className="btn …"` and 25 `className="field"` sites exist; `Button` is
  rendered 4 times and `Field` once, so the components cover a minority today.
  `variant="danger"` and `variant="quiet"` have no caller.

## Goals / Non-Goals

**Goals:**

- One tracked stylesheet, `css/app.css`, that is the Tailwind entry, the only
  token source and the only place a global rule can live.
- Utility-first markup for every route, with repeated groups expressed as React
  components or a shared class builder.
- A measured proof that the conversion did not move pixels: a committed
  computed-style baseline from `origin/main` and a check that compares it.
- A policy check that makes a second stylesheet, a dead token or a dangling
  `var()` reference fail in CI.

**Non-Goals:**

- No visual redesign. Any deliberate visual change belongs to its own change
  and updates the baseline.
- No dependency change: Tailwind v4 and `@tailwindcss/vite` stay as they are; no
  `clsx`, `tailwind-merge`, `cva` or Preflight plugins are added.
- `/help` and `/demo` stay DOM-string screens; only their class strings change.
- The legacy bridge stays: it is the fallback for any path without a native
  screen.
- No engine, command, store, router, i18n or storage change.

## Decisions

### 1. `css/app.css` becomes the Tailwind entry

`index.html` keeps its single `<link rel="stylesheet" href="css/app.css">`; Vite
already processes that link and emits one bundled stylesheet, so the entry does
not have to move under `src/ui`. `src/ui/main.tsx` loses its CSS import, and
`src/ui/styles/` is deleted.

The entry file:

```
@import "tailwindcss" source(none);
@source "../index.html";
@source "../src/ui";
@source "../src/entry";
@font-face { … }
@theme { … }            /* the only token block */
@custom-variant short (…);
@keyframes player-reveal { … }
@layer base { … }       /* the six rules in decision 4 */
```

`source(none)` keeps the existing rule that tests, locale catalogs and
generated files cannot add utilities; the three explicit `@source` entries
cover the shell, the DOM screens and the static document. `index.html` must be
scanned because its banner and status markup uses utilities after the
conversion.

Alternative considered: keep `src/ui/styles/shell.css` as the entry and delete
the root `css/` directory. Rejected — `index.html` would then link into `src/`,
and `css/app.css` is named by the policy check, the docs and the token
requirements.

### 2. `@theme` is the only declaration

The `:root` block is deleted. Tailwind v4 emits `@theme` values as custom
properties on `:root`, so the existing `var(--radius)`, `var(--pad)` and
`var(--color-*)` references keep resolving. `--font-role` is referenced
nowhere and is removed; if a screen later needs the serif stack, it becomes
`--font-role` in the theme and the `font-role` utility.

The `@theme` keeps the current token names so `bg-panel`, `text-muted`,
`border-line-2` and the team colours keep their meaning.

### 3. The base reset stays explicit

Tailwind's Preflight is not enabled. Measured: importing it moved 64 recorded
values across the eight routes — every heading dropped from weight 700 to 400
and every paragraph lost its default margins — because Preflight zeroes all
margins and makes headings inherit weight. Reproducing today's rendering then
means adding a weight and a margin utility to dozens of headings and
paragraphs, which is more code and more risk than the reset it replaces.

The `@layer base` block instead keeps the small reset the application already
had: `box-sizing`, the document surface, form typography, focus visibility,
`[inert]`, `[hidden]`, touch behaviour and the reduced-motion cancellation. A
utility always outranks it, because the layer order is declared first.

### 4. Base rules that stay

A rule stays in `@layer base` only when it is document-wide and cannot be a
class on the element it affects:

| Rule | Why it stays |
|---|---|
| `:focus-visible` outline | keyboard focus must be visible on every control, including the DOM screens |
| `[inert] { pointer-events: none }` | the dialog marks the rest of the page inert; Preflight has no such rule |
| `button, a, summary, select { touch-action: manipulation }` | global touch behaviour, currently one rule for every control |
| `button, .field, summary { max-width: 100% }` | guards long labels; a per-element utility would be forgotten |
| `prefers-reduced-motion` block | cancels animation and transition globally, including Radix |

`#screen { min-height: 100dvh }` becomes `class="min-h-dvh"` in `index.html`;
`input[type=checkbox]` sizing becomes `size-6 align-middle` on the single
checkbox; `card`, `btn--danger` and `btn--quiet` are deleted with their rules.

### 5. Components replace repeated CSS

- `Button` keeps `variant: "default" | "accent"` and maps them to utilities
  (`inline-flex items-center justify-center gap-1.5 min-h-11 rounded-lg
  border border-line-2 bg-panel-2 px-3 py-2 text-sm hover:bg-btn-hover
  disabled:opacity-40 disabled:cursor-not-allowed`, accent variant adds the
  accent tokens). `danger` and `quiet` are removed: no caller uses them.
- `buttonClass(variant)` is exported from the same module for the `<a>` and
  `<label>` elements that must look like a button. Adding `@radix-ui/react-slot`
  would give `asChild`, but a class builder is one export instead of a new
  dependency.
- `Field` renders the label plus the input with utilities; `inputClass` is
  exported for the raw `<input>` and `<select>` elements that do not want the
  wrapper.
- `label.tsx` adds `Label` (a span with the uppercase muted label utility set)
  and `labelClass`, replacing the `.label` primitive.
- `LanguageSwitch` uses utilities; the `lang-switch` class name stays only as
  an inert hook for `scripts/browser-check.mjs`.

### 6. Legacy class names survive only as inert hooks

`scripts/browser-check.mjs` selects `.host`, `.bag-*`, `.seat-*`, `.script-*`,
`.setup-banner`, `.secrets-*`, `.lang-switch`, `.sheet-page` and
`.player-card`. Rewriting ~130 selectors to new hooks would add churn and
risk to a styling change, and the repository already documents the convention
"converted screens keep legacy class names as inert hooks"
(`docs/architecture.md`, UI shell). The classes stay in markup where a check
selects them; no stylesheet rule defines them, and the policy check fails if a
`bag-`, `seat-`, `setup-`, `secrets-`, `script-`, `host-` or `tbl-` selector
reappears. State classes such as `is-selected` and `is-bad` stay as hooks, and
the visible state comes from conditional utilities.

### 7. Conversion order per screen

Each screen is converted against the baseline, one commit at a time:

1. `bag.tsx` (largest: bag.css plus setup.css blocks), then `/seat`
   (`seat.css`), then `/secrets` (`setup.css` secrets blocks).
2. Sweep the utility screens for the shared primitives: `sheet.tsx`,
   `player.tsx`, `public.tsx`, `screens/table/*`.
3. `src/entry/screens/help.ts` and `demo.ts` (class strings only).
4. `index.html` banner, theme picker and status markup.

### 8. Parity harness

`scripts/style-parity.mjs` records and compares computed styles:

- `node scripts/style-parity.mjs --record` writes
  `scripts/fixtures/computed-styles.json`; `--check` compares and exits
  non-zero naming route, element and property.
- Routes: `/bag`, `/seat`, `/secrets`, `/table`, `/player`, `/sheet/en`,
  `/help`, `/demo`; viewports 1280×900 and 390×844.
- Probes are the existing inert class hooks plus `data-*` attributes and ids,
  so the same list works before and after the conversion.
- Properties: display, position, width, height, margin, padding, gap,
  grid-template-columns, font-family, font-size, font-weight, line-height,
  letter-spacing, text-transform, color, background-color, border (width,
  colour, radius, side), box-shadow, opacity, overflow.
- States: default, `hover` on `[data-act=deal]` and a card control, keyboard
  focus on `[data-act=deal]`, `disabled` on the deal control, and the player
  card with `reducedMotion: "reduce"`.
- The baseline is recorded with the same script run against a build of
  `origin/main`, served by `scripts/serve-dist.mjs`.

Alternative considered: compare against a screenshot. Rejected — pixel diffs
depend on font rendering and antialiasing per platform, while the computed
properties are the actual contract and give a readable failure.

### 9. Policy check rewrite

`scripts/check-types-policy.mjs` drops `TOKEN_MAP`/`TOKEN_THEME` and gains:

- Tracked stylesheet scan: exactly `css/app.css` under `css/` and `src/`.
- Duplicate declaration: a `:root` block that repeats a theme token fails.
- Entry shape: the stylesheet imports `tailwindcss` and declares its
  `@source` entries.
- Reference scan over `src/**` and `index.html`: every `var(--…)` resolves to a
  declared theme token or a local declaration.
- Dead token: a colour token with no `(bg|text|border|ring|outline|fill|
  stroke|decoration|divide|shadow)-<name>` class and no `var()` use fails;
  `--radius` and `--pad` need a `var()` use.

`scripts/check-types-policy.test.mjs` gets a fixture per new failure mode, and
the mirror tests are deleted.

## Risks / Trade-offs

- **Preflight shifts default typography and spacing** → the baseline covers
  every route and the converted screens add the explicit utilities; a missed
  heading fails the check instead of shipping.
- **The baseline freezes current quirks.** It records today's visuals,
  including any accidental value. Accepted: this change is a refactor; a
  deliberate fix updates the fixture in its own change with a reason.
- **The class strings grow.** Converted elements carry long `className` values
  → shared components cover the repeated groups (buttons, fields, labels,
  tokens) and no new CSS is allowed to absorb the rest.
- **Dynamic class names are invisible to Tailwind's scanner** → keep static
  maps (`TEAM_CLASS` style) as the existing screens already do; the baseline
  catches a missing value.
- **Inert class hooks blur "unused class".** A class may survive only because a
  check selects it → the policy check keeps the rule that no stylesheet defines
  it, and the hooks are listed in `docs/architecture.md`.
- **The migration is a large diff** → one screen per commit, baseline check
  after each, so a regression is attributable.
- **The parity script can flake** if it reads styles before fonts load → wait
  for `document.fonts.ready` and for the route's ready selector before
  recording or comparing.

## Migration Plan

1. Record the baseline from `origin/main` and commit it with the check script.
2. Rewrite `css/app.css`, delete the other stylesheets, update `index.html` and
   the policy check.
3. Convert components, then screens in the order of decision 7, running
   `--check` after each.
4. Update `docs/architecture.md`, `css/AGENTS.md`, `src/ui/AGENTS.md`, the root
   `AGENTS.md` table and `SPEC.md`.
5. Run `npm run verify`, `node scripts/browser-check.mjs` and
   `openspec validate --changes --strict`; open the pull request and stop.

Rollback: revert the branch. The deleted stylesheets, the old components and
the recorded baseline are all in git; no data migration or storage change is
involved.
