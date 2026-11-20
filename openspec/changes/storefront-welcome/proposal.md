# Proposal

Issue: #384

## Why

The app shipped one visual system, Arcane Instrument: an obsidian instrument
panel with brass and turquoise. The owner rejected it as a generic dark tool and
pinned a new direction from three references: a 1970s video store, an industrial
utility-label system, and a pixel-game panel grid, the video store dominant. The
app also had no first screen: `/table` was the default route, so a new host met
the console before understanding what the product is. `/public` duplicated the
console's public facts on a second screen and was the only surface that offered
players a path into the host console.

## What Changes

- Replace the visual system: tube black, shelf grey, bone print, one rental
  yellow action, rent red, signal blue and cult purple, cream price labels,
  team-coloured tape spines, hazard strips, Oswald display, Golos Text prose,
  PT Mono system tags. Self-hosted, no network font.
- Add `/` as the welcome page and the default route: one yellow action that
  starts a game, a continue action when a game is in progress, a shelf of five
  real first-night roles plus one struck role, the three scripts as staff picks,
  a membership card and a system-tag row. The sample is labelled as a sample; the
  page never writes the saved game.
- Remove `/public` and its nav link. `/public` now falls back to `/table` like an
  unknown path. The core `publicGameView` projection and its privacy tests stay.
- Add a visible close control to the night step sheet and the heir sheet; Escape
  and the backdrop keep working.
- Move the app bar's inline-navigation breakpoint from 1440 to 1200 CSS pixels
  and add the Home tab.
- **BREAKING** for the saved route: an old `/public` bookmark lands on `/table`.
  **BREAKING** for visual acceptance: the computed-style fixture predates this
  world and is not re-recorded here.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: the welcome route and its composition, the seven-link bar at
  1200 px, the step-sheet close control, and the removal of `/public` from the
  private-route and mobile-navigation requirements.
- `app/ui-and-privacy`: the route table gains `/` and loses `/public`; privacy
  binds the player handoff and the exported projection.
- `app/arcane-visual-system`: materials, palette, typography, shape and motion
  move from the Arcane Instrument system to the store system.

## Impact

- UI: `css/app.css` (tokens and materials), `src/ui/screens/home.tsx` (new),
  `src/ui/shell.tsx`, `src/infrastructure/routing/history-router.ts`,
  `src/ui/components/arcane/*`, `src/ui/screens/table/{ring.tsx,surface.tsx,
  styles.ts,dialogs.tsx}`, `bag.tsx`, `player.tsx`, `secrets.tsx`,
  `src/ui/i18n/locales/{ru,en,az}.ts`; `src/ui/screens/public.tsx` is deleted.
- Assets: self-hosted Oswald, Golos Text and PT Mono (OFL) under
  `public/assets/fonts/`; the Inter face is no longer loaded by the app.
- Checks: `scripts/browser-check.ts` loses the `/public` cases and retargets the
  privacy case to `/player`; `scripts/scenarios/privacy-public-seat.ts` becomes
  `privacy-player-seat.ts` and reads the projection instead of the removed
  screen; `scripts/check-types-policy.ts` skips tool-owned directories.
- Records: `PRODUCT.md`, `DESIGN.md`, `README.md`, `SPEC.md`,
  `docs/architecture.md`, `docs/rules-matrix.md`, `public/manifest.webmanifest`.
- Untouched: the engine, state model, commands, storage keys, role art and every
  other route. No new runtime dependency.
