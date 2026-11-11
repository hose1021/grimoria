# Design

## Context

See `proposal.md` - Why. State that shapes the approach:

- The shell routes `/sheet`, `/player`, `/public`, `/seat` once this branch
  lands; every other path renders through `legacy-bridge.tsx`, which acquires the
  writer lock before mounting.
- `ShellPorts` exposes the router, game source, roles, strings, locale, assets,
  preferences, the writer lock and the commands used by the migrated screens.
- `js/bag.js` keeps its editor state in module variables and re-renders by
  rewriting `innerHTML`; `js/seat.js` keeps a draft order plus an undo stack;
  `js/secrets.js` dispatches one command per select change.
- `src/core/model/rules.ts` and `src/core/model/scripts.ts` hold the rule and
  script data. `js/presets.js` and `js/library.js` remain legacy modules.

## Goals / Non-Goals

**Goals:**

- The three setup screens render in the shell with the same look and behaviour.
- Draft state stays local; committed state comes from the store.
- A publish updates names, totals and errors without discarding a draft.

**Non-Goals:**

- Converting `css/bag.css`, `css/seat.css` or `css/setup.css` to Tailwind.
- Moving `js/presets.js` or `js/library.js` into `src/core`.
- Changing the bag rules, the preset data or the stored schema.

## Decisions

**Ports for the legacy helpers, not imports.** `src/ui` may not import the
legacy tree, so `presets` and `library` enter `ShellPorts` with structural
types; the composition root passes the existing modules unchanged. The
alternative, moving those modules into `src/core` first, is a separate change
with its own tests and no user-visible effect.

**The stylesheets stay for this change.** The three screens keep their class
names and markup, so the CSS still owns the look and the visual delta is zero by
construction. Converting the styles without a computed-style harness for three
screens would mix two risky changes; the conversion is the next change.

**Drafts are local, snapshots are not.** `/seat` keeps the order draft and its
undo stack in component state; `/bag` keeps the editor state the legacy module
kept. The store subscription feeds names, roles, counts, errors and the totals,
so an external write is visible, but a publish never overwrites a draft. An
empty seat draft adopts a published order, because another tab may have dealt
the bag while this screen showed the empty state.

**Commands stay named.** Each mutation is a narrow method on `ports.commands`
(`setOrder`, `setHerring`, `setSetupInfo`, `normalizeSecrets`, `startNight`,
`bagUpdate`, `dealGame`), so the UI cannot compose arbitrary commands. The bag
patch type is the core `BagPatch`.

**The writer lock moves with the screen.** `/seat` and `/secrets` acquire it on
mount and render the shared `WriterBusy` card when another tab holds it, exactly
as the bridge did.

## Risks / Trade-offs

- **A large bag component.** The legacy screen is 1,966 lines. The port keeps its
  four sections and its event paths; the browser checks cover presets, manual
  picks, undo, import, deal and the narrow-width layout.
- **Two sources of error text.** `setupErrors` comes from `core`; the bag hint
  list comes from the legacy presets module through a port. Both are needed for
  the same header, and the port keeps the messages identical.
- **Library persistence.** The named bag library lives in `localStorage`
  through the legacy module; the port calls it before and after mutations, so a
  failure still surfaces as the current inline error.
- **Seat drag.** The pointer drag keeps a ghost element; the legay ring used CSS
  custom properties for positions so the dense mobile grid can reset them. The
  React port keeps that mechanism; inline `left`/`top` broke the dense layout.
