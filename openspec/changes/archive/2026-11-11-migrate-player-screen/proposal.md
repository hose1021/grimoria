# Proposal

Issue: #77
Part of #52.

## Why

`/sheet` and `/public` render in React; `/player` is the last Tailwind-only
screen that still composes HTML strings in `js/player.js`. It owns a 45-second
deadline, a modal and a command dispatch, so a second screen would copy that
logic instead of reusing the shell's components. The legacy screen also never
re-renders when the store publishes, which leaves the picker stale after an
external write.

## What Changes

- Add `src/ui/screens/player.tsx`: number picker, timed role card, name form and
  hand-back dialog, styled with the same Tailwind classes as today.
- Add the missing shell ports: role lookup by id, the `claimSeat` command and
  the exclusive writer lock.
- Route `/player` to the native screen and delete `js/player.js` with its mount
  table entry.
- Carry the existing class names as inert hooks so the browser checks keep their
  selectors and the computed appearance does not change.

Not breaking for users: URLs, storage keys, schema and the offline protocol stay
unchanged. The picker now follows the store subscription, so an external publish
updates the seat list.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: the `/player` handoff, its deadline, its claim path and its
  hand-back warning join the shell requirements.

## Impact

- New: `src/ui/screens/player.tsx`, `src/ui/components/writer-busy.tsx`.
- Changed: `src/ui/ports.ts`, `src/ui/shell.tsx`, `src/ui/legacy-bridge.tsx`,
  `src/ui/components/dialog.tsx`, `src/entry/main.ts`.
- Removed: `js/player.js`.
- Tests: `scripts/browser-check.mjs` gains a publish-updates-picker assertion;
  the node suites stay green.
- Docs: `AGENTS.md`, `SPEC.md`, `docs/architecture.md` move `/player` into the
  shell.
