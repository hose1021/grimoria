# Proposal

Issue: #82
Part of #52.

## Why

`/bag`, `/seat` and `/secrets` are the last host screens that render through the
legacy bridge. They own their DOM listeners, draft state and command dispatch,
so they cannot reuse the shell's ports, the writer-busy card or the store
subscription. `/table` is the only route left after them.

## What Changes

- Add `src/ui/screens/bag.tsx`, `seat.tsx` and `secrets.tsx`; route all three in
  the shell and delete `js/bag.js`, `js/seat.js` and `js/secrets.js`.
- Extend `ShellPorts`: the seat order command, the secrets commands, the bag
  patch and deal commands, the preset helpers and the named-library helpers.
- Each screen reads the published snapshot; its draft stays local until the host
  commits it. A publish never replaces a draft in progress.
- Keep the current markup and class names, so `css/bag.css`, `css/seat.css` and
  `css/setup.css` stay untouched. Converting them to Tailwind utilities is a
  separate change, proven by the computed-style comparison.

Not breaking for users: URLs, storage keys, schema, presets and the offline
protocol stay unchanged. A publish from another tab now updates the screens
instead of leaving them stale.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: the setup screens, their drafts, their commit paths and their
  writer lock join the shell requirements.

## Impact

- New: `src/ui/screens/{bag,seat,secrets}.tsx`.
- Changed: `src/ui/ports.ts`, `src/ui/shell.tsx`, `src/entry/main.ts`.
- Removed: `js/bag.js`, `js/seat.js`, `js/secrets.js`.
- Tests: `scripts/browser-check.mjs` gains a seat publish assertion; the rest of
  the harness covers the three screens.
- Docs: `AGENTS.md`, `SPEC.md`, `docs/architecture.md`.
