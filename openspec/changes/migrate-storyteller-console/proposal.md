# Proposal

Issue: #85
Part of #52.

## Why

`/table` is the last host screen on the legacy bridge. `js/table.js` (1822
lines) and `js/table-dialogs.js` own their DOM, drafts and dispatch, so the
console cannot use the shell's writer-busy card, its single store subscription,
the shared dialog component or the Tailwind tokens. Two stylesheets exist only
for it: `css/host.css` (the console) and `css/table.css` (dead `tbl-*` styles
with no consumer).

## What Changes

- `/table` renders as a native shell screen: header, seat rail, mobile panels
  (play, roster, tools), night card, day card, deal and setup cards, over card
  with the review gate, side panel (queue, log, notes, timer) and the overlays
  (hide, information, grimoire, role card, correction, export, import).
- The shell ports gain a typed `dispatch(command)` and the per-role guidance
  lookup, so the screen keeps the store path and never imports `js/`.
- The screen acquires the exclusive writer lock and shows the shared
  writer-busy card. After a private hand-off it mounts behind the hide overlay
  until the host reveals the grimoire, as the bridge did.
- Tailwind replaces `css/host.css`, `css/table.css` is deleted as dead code,
  and `src/ui/components/handback-cover.tsx` stops relying on `host-*` classes.
- The five legacy primitives that `/demo` and `/help` still use move into
  `css/app.css`, which stays until `retire-legacy-ui`.
- No **BREAKING** change: routes, command payloads, the saved state, exports
  and the localization catalogs stay the same.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `app/ui-shell`: adds the storyteller console requirements (native table
  screen, writer-lock gate, role card and grimoire overlays, review gate,
  mobile panels).

## Impact

- Code: `src/ui/screens/table*`, `src/ui/ports.ts`, `src/entry/main.ts`,
  `src/ui/shell.tsx`, `src/ui/components/handback-cover.tsx`, `index.html`,
  `css/app.css`; delete `js/table.js`, `js/table-dialogs.js`, `css/table.css`
  and `css/host.css`.
- Tests: `scripts/browser-check.mjs` gains the console paths; a new
  `src/ui/screens/table/*.test.ts` covers the pure view helpers.
- Docs: `AGENTS.md`, `SPEC.md` and the `docs/architecture.md` migration map.
