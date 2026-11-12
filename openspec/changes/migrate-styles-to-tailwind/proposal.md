# Proposal

Issue: #137

## Why

Grimoria still ships five stylesheets and about 1450 lines of hand-written
screen CSS for `/bag`, `/seat` and `/secrets`, while the console and the other
native routes already use Tailwind utilities. Two style systems mean every
visual change has to be made twice, Preflight stays off, and the palette is
declared twice: once in the `:root` block of `css/app.css` and again as a
mirrored `@theme` block that a policy check keeps in sync. The previous setup
and console migrations deliberately left the conversion for a separate change
that proves the computed styles; this is that change.

## What Changes

- Reduce the project to one global stylesheet, `css/app.css`, built from
  Tailwind: the theme and utilities imported into explicit layers with
  explicit `@source` entries, one `@theme` block that is the only palette and
  spacing declaration, the Inter `@font-face`, the `short` variant, the
  `player-reveal` keyframes, and one base layer limited to the document
  surface and the handful of global rules utilities cannot express.
- Delete `css/bag.css`, `css/seat.css`, `css/setup.css`,
  `src/ui/styles/shell.css` and `src/ui/styles/tokens.css`. `index.html` links
  only `css/app.css`; `src/ui/main.tsx` stops importing a stylesheet.
- Replace every legacy class with utilities in the markup that uses it:
  `btn`, `btn--accent`, `btn--danger`, `btn--quiet`, `field`, `label`, `card`,
  `lang-switch`, `brand-mark`, `brand-lockup`, `storage-status`,
  `update-banner`, `update-actions`, `offline-status`, `#screen`, and the
  `bag-*`, `seat-*`, `setup-*`, `secrets-*`, `script-*` screen rules.
  Repeated patterns stay in React: `Button`, `Field` and `LanguageSwitch` gain
  utility classes, and one `Label` primitive replaces the uppercase muted
  label.
- **BREAKING** (internal): the unlayered legacy layer disappears; every rule
  now sits in a layer below the utilities. Routes, commands, saved state,
  exports, storage keys, offline caching and localization are unchanged; no
  user-visible style change is intended.
- Replace the token mirror check with a stylesheet policy: exactly one tracked
  stylesheet, no per-screen CSS, every `var(--…)` reference resolves to a
  declared token, and a declared token that no class or rule uses fails.
- Add computed-style evidence: a baseline recorded from the pre-migration
  build, compared at 1280 px and 390 px for the migrated routes, covering the
  default, hover, `:focus-visible` and reduced-motion states.

## Capabilities

### New Capabilities

None. The existing capabilities already own the stylesheet contract.

### Modified Capabilities

- `app/design-tokens`: "One token source" and "Token use is checked" become one
  `@theme` block in the one stylesheet, and a new "One global stylesheet"
  requirement replaces the mirrored source.
- `app/ui-shell`: "Shell styles without a global reset" becomes the single
  Tailwind stylesheet with Preflight; "Setup screens keep their stylesheets"
  is removed and replaced by a utilities-only setup screen requirement;
  "Console styles without legacy stylesheets" extends to `/help` and `/demo`;
  a new "Computed-style parity" requirement adds the measured comparison.

## Impact

- Stylesheets: `css/app.css` (rewritten), `css/bag.css`, `css/seat.css`,
  `css/setup.css`, `src/ui/styles/shell.css`, `src/ui/styles/tokens.css`
  (deleted), `index.html`.
- Screens and components: `src/ui/screens/{bag,seat,secrets,sheet,player,public}.tsx`,
  `src/ui/screens/table/*`, `src/ui/components/*`,
  `src/entry/screens/{help,demo}.ts`, `src/ui/main.tsx`.
- Checks: `scripts/check-types-policy.mjs` and its test, `scripts/browser-check.mjs`,
  a new `scripts/style-parity.mjs` with a committed baseline fixture.
- Documentation: `docs/architecture.md`, `css/AGENTS.md`,
  `src/ui/styles/AGENTS.md`, the root `AGENTS.md` file table, `SPEC.md`.
- No dependency, API, route, state, storage or i18n change; no new runtime
  package.
