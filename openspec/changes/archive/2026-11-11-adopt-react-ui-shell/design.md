# Design

## Context

See `proposal.md` - Why. Current state that shapes the approach:

- `js/app.js` holds a nine-entry route table and mounts one legacy screen module
  per route; each screen renders strings and owns its listeners.
- The store is a facade over `src/application/store/create-game-store.ts` and
  exposes `state` and `subscribe`; state is already typed and validated.
- `css/app.css` defines the `:root` tokens; eight per-screen stylesheets consume
  them. Vite builds `dist/`; the service worker precaches that artifact.
- Runtime dependencies are zero today; the type and boundary policies run in the
  same gate as the tests.

## Goals / Non-Goals

**Goals:**

- One shell that can host migrated and unmigrated routes side by side.
- One component vocabulary and one token source.
- `/sheet` migrated with provable parity.
- A build that stays offline-capable and keeps Preflight off.

**Non-Goals:**

- Migrating any other screen, enabling Preflight, deleting legacy CSS.
- A visual redesign: the migrated screen keeps the current look.
- A second router, a second store, or a second token set.

## Decisions

**React 19 and ReactDOM over the existing Vite build.** The accepted plan
already assumes a React shell; the alternative, hand-rolled web components,
would duplicate the work the migration map schedules. React is a development
time framework but a runtime dependency, so it is listed in `dependencies`.

**Tailwind v4 through `@tailwindcss/vite`, with Preflight off.** In v4 Preflight
ships with the convenience import, so the shell imports
`tailwindcss/theme.css` and `tailwindcss/utilities.css` into explicit layers
instead. Enabling the reset now would restyle every legacy screen; the reset is
enabled only with `retire-legacy-ui`, which owns the CSS audit. The trade-off is
that a few utility classes look different without Preflight (default margins,
`box-sizing`); the shared components set what they need explicitly.

**One `@theme` block fed from `css/app.css`.** The shell's styles call
`var(--color-...)` values declared once by mapping the existing tokens. A
second palette is rejected: it would drift the moment a legacy screen changes a
colour, and the token check exists to catch exactly that.

**Router as a small store, plus a bridge.** The shell keeps path routing and the
same URLs. `src/ui/router.ts` subscribes to the browser history and exposes the
current path; `legacy-bridge.tsx` maps a path to the current screen module and
calls its `mount(root)` and cleanup inside a React layout effect. Hash routing
stays a separate decision because it would change public URLs.

**`useSyncExternalStore` over the store facade.** `getSnapshot` returns a cached
snapshot object that is recreated only when the store publishes; two reads with
no change return the same reference. A React context copy of the game state is
rejected: it would create a second source of truth. Transient drafts (selected
targets, filters, dialog open state) stay in component state and are never
persisted.

**Radix primitives only for dialog and label.** `@radix-ui/react-dialog` gives
the focus trap, Escape handling, `aria-modal` and focus restore the spec
requires, which is error-prone to hand-roll. `@radix-ui/react-label` keeps the
label control association. Styling stays in our Tailwind classes. The full
shadcn distribution is rejected here: it adds class-variance-authority, clsx,
tailwind-merge and icon packages, and its theme assumes Preflight and its own
variable set - three conflicts with the constraints above. Button, Field,
RoleToken, PlayerSeat, SaveStatus and OfflineBanner are small enough to own.

**Runtime dependency budget.** `react`, `react-dom`,
`@radix-ui/react-dialog`, `@radix-ui/react-label`. Each is justified above;
anything else needs a separate decision.

**Localization stays with the existing catalogs.** `/sheet` reads role names and
abilities from the locale catalogs through the current role lookup; the shell
adds no translation layer. A typed `t()` key set is a later change, not this
one.

**Offline stays truthful.** The React root and its Tailwind styles ship in
`dist/`; `scripts/build-offline.mjs` regenerates `sw.js` with a new cache id and
the asset count grows. The update protocol is untouched.

## Risks / Trade-offs

- **Two renderers coexisting.** The bridge must call the legacy cleanup in the
  same lifecycle as the React unmount, or a route switch leaks listeners. The
  browser check exercises a route switch in both directions.
- **Bundle growth.** Radix and React add to `dist/`; the offline cache and the
  first load grow. Measure before and after and record the numbers in the PR.
- **Style leakage.** Tailwind utilities and legacy CSS can both match an
  element; without Preflight, utility defaults differ from the legacy reset. The
  shell scopes its styles and the parity check compares computed values on the
  sheet.
- **Snapshot identity.** A sloppy `getSnapshot` that rebuilds the object starts
  an infinite render loop. The design fixes the rule and the test asserts the
  reference is stable.
- **Catalog loading.** `/sheet/<lang>` loads a catalog before mounting today;
  the React screen must keep that ordering and the recoverable error state.
