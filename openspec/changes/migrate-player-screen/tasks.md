# Tasks

Implementation starts only after the owner accepts this proposal. Each stage is
a separate commit on the same branch and can be reverted alone. The gate after
every stage: `npm run typecheck`, `npm test`,
`node scripts/check-types-policy.mjs`.

## 1. Failing check

- [x] 1.1 Extend the `/player` block in `scripts/browser-check.mjs`: after the
  first paint, publish a state with seat 2 claimed and require the number with
  `data-seat="1"` to disappear within three seconds.
- [x] 1.2 Run `node scripts/browser-check.mjs` and record the timeout: the legacy
  picker renders once and never subscribes to the store.

## 2. Ports and shared components

- [x] 2.1 Add `roles.byId`, `commands.claimSeat` and `writer.acquire` to
  `ShellPorts` and wire them in `src/entry/main.ts`; move the bridge from
  `legacy.acquireWriter` to `writer.acquire`.
- [x] 2.2 Extract `WriterBusy` and render it from the bridge and the player
  screen.

## 3. Screen

- [x] 3.1 Add `src/ui/screens/player.tsx`: the setup message, the number picker,
  the timed role card, the name form and the hand-back dialog.
- [x] 3.2 Route `/player` in `src/ui/shell.tsx` and remove the legacy entry from
  `src/entry/main.ts`.
- [x] 3.3 Delete `js/player.js`; confirm that no module imports it.

## 4. Documents and gate

- [x] 4.1 Update `AGENTS.md`, `SPEC.md` and `docs/architecture.md`.
- [x] 4.2 Run `npm run verify`, `node scripts/browser-check.mjs`,
  `node scripts/openspec-check.mjs` and `openspec validate --changes --strict`.
- [x] 4.3 Open the pull request, report the checks and wait for the owner.

## Evidence

- RED: `node scripts/browser-check.mjs` fails with
  `page.waitForFunction: Timeout 3000ms exceeded` at the new
  "picker follows an external publish" assertion, because `/player` still
  rendered the legacy DOM.
- GREEN: `node scripts/browser-check.mjs` passes (phone/tablet, night/day,
  Virgin, route cleanup, privacy, reload, cross-tab, languages, native role
  sheet, dialog contract, offline reload, safe update); `npm run verify` passes.
