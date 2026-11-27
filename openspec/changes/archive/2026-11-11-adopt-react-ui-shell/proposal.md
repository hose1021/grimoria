# Proposal

Issue: #69
Part of #52.

## Why

The store and the engine are typed and live in `src/core`, but every screen is
still a string renderer in `js/` with its own DOM listeners and no shared
component layer. Without a React root, Tailwind and shared components, each
screen migration would invent its own conventions, and the UI layer would keep
duplicating markup, focus handling and dialog behaviour.

## What Changes

- Add a React 19 root that owns the app shell and a router store over the
  existing path routing; routes that have not migrated yet render through a
  `LegacyScreen` bridge that calls their current `mount(root)` and cleanup.
- Add Tailwind CSS v4 through `@tailwindcss/vite`, importing theme and utilities
  into explicit layers so Preflight stays off while the legacy CSS exists.
- Expose the existing `:root` tokens from `css/app.css` through one `@theme`
  block; no second palette.
- Add shared components: Button, Field, Dialog (Radix), RoleToken, PlayerSeat,
  SaveStatus, OfflineBanner.
- Migrate `/sheet` to React as the first native screen, with parity to
  `js/sheet.js`.
- Add runtime dependencies: `react`, `react-dom`, `@radix-ui/react-dialog`,
  `@radix-ui/react-label`.

Not breaking for users: URLs, storage keys, schema and the offline protocol stay
unchanged. The legacy screens keep working through the bridge.

## Capabilities

### New Capabilities

- `app/ui-shell`: the React entry, the router store and legacy bridge, the
  Tailwind pipeline without Preflight, the store hook, the shared components,
  and the `/sheet` parity requirement.
- `app/design-tokens`: one token source read from the existing stylesheet and
  exposed to Tailwind, with no second palette.

### Modified Capabilities

None. Existing requirements are implementation-neutral for this change; the
layer and privacy rules already constrain the new code.

## Impact

- New: `src/ui/` (root, router, components, screens/sheet, styles), Vite config
  change, `package.json` dependencies, `index.html` entry, `js/app.js` mount
  point, `js/test-entry.js` untouched for now.
- Tests: the Playwright harness gains a `/sheet` parity check; node tests and
  the boundary policy stay green.
- Build: Vite emits the React root and Tailwind utilities into `dist/`; the
  service worker is regenerated and its cache id changes.
- Docs: `AGENTS.md`, `SPEC.md` and `docs/architecture.md` gain the UI layer.
