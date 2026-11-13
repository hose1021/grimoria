# Proposal

## Why

Grimoria is a dark fantasy table aid used under time pressure, but its interface
still reads as a generic admin dashboard: grey cards, uniform rounded controls
and a screen-specific visual language. The setup flow is mid-migration, so the
site now mixes directions. A Storyteller must read phase, actors, votes, deaths
and the next action within seconds, and the product must feel like a tabletop
game client rather than a CRUD tool.

The owner selected the Arcane Instrument direction. Its full prototype exists
under `design/prototypes/03-arcane-instrument-full.html` and covers the table,
setup, seats, secrets, player handoff and role sheet. This change applies that
direction to the whole site.

Issue: #137 (move all styling to Tailwind utilities). The owner may open a
separate design issue and replace this link before implementation.

## What Changes

- Replace the visual language on every route with Midnight Arcane Table /
  Arcane Instrument: dark stone, gunmetal panels, brass and amber accents,
  crimson only for danger, parchment only for role and rules surfaces, sharp
  shapes, one glow at a time.
- Add the Arcane Instrument token layer to the shared source and the Tailwind
  theme, and register every new token in the token policy check.
- Add a reusable presentational layer: `ActionButton`, `PlayerToken`,
  `RoleCard`, `PhasePanel`, `EventLog`, `GrimoirePanel` and `GameTable`.
  Screens compose these components and keep their existing ports and commands.
- Recompose the Storyteller console into three zones: controls on the left,
  the seat table in the centre, the event log on the right. Day and night each
  get a dedicated control panel, with the current actor, pending action, target
  choice, resolve control and progress in the same viewport.
- Keep the table readable at a glance: phase, living and dead seats, vote
  pips, poison and protection marks, the active actor, the next action.
- Recompose setup: presets, random and the manual picker in one frame. The
  manual picker groups every role of the selected script by team and drops the
  search, edition and team filters, because the chosen script already bounds the
  list.
- Restyle seats, secrets, player handoff, public view and the role sheet in the
  same language. The sheet is grouped by team, matching `/sheet` today.
- Restyle the legacy `help` and `demo` screens last, then delete
  `css/bag.css`, `css/seat.css` and `css/setup.css` and stop loading them.
- **BREAKING** for repository styling only: the global reset and Tailwind
  Preflight may be enabled once no screen depends on the legacy unlayered rules.
  Legacy class names that the browser checks read stay as inert hooks.
- No new runtime dependency. Radix Dialog and Label are already installed and
  cover the dialog behaviour; shadcn/ui is not added.

## Capabilities

### New Capabilities

- `app/arcane-visual-system`: the visual contract of the interface. Material
  roles, palette roles, typography, shape and motion rules, the component set,
  required states, and the two-second state read on the table.

### Modified Capabilities

- `app/design-tokens`: the shared token source gains the Arcane palette,
  radii and elevation; the legacy-only colour names retire with the legacy
  stylesheets; the token check covers the new names. The one-source rule stays.
- `app/ui-shell`: the shell base and reset, the console composition, the
  manual bag picker and the removal of the setup stylesheets change. Every
  behavioural requirement about routes, commands, drafts, dialogs, privacy and
  the role sheet stays as it is.

## Impact

- `index.html`: the three legacy setup stylesheet links are removed.
- `css/app.css`: reduced to the font face, body base, focus ring, global
  banners and the new token source; `css/bag.css`, `css/seat.css` and
  `css/setup.css` are deleted.
- `src/ui/styles/tokens.css` and `src/ui/styles/shell.css`: the Arcane theme,
  Preflight, the new radii and elevation.
- `src/ui/components/`: new arcane primitives and the retained dialog, field,
  language switch, role token and hand-back components.
- `src/ui/screens/`: the table console, bag, seat, secrets, player, public and
  sheet screens; `src/entry/screens/help.ts` and `demo.ts` last.
- `scripts/check-types-policy.mjs`: the token map gains every new token.
- `scripts/browser-check.mjs`: selectors that read retired classes are updated
  deliberately, while behaviour assertions stay.
- `SPEC.md`, `docs/architecture.md`, `docs/design-direction.md` (new design
  note), `openspec/specs/` after archive.
- No storage-key, route or game-rule change. Two command touch-ups ride along
  and are named in `tasks.md`: `setSetupInfo` keeps the chosen information
  role, and `skipStep` accepts an omitted reason.
