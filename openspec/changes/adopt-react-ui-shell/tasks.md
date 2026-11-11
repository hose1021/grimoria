# Tasks

Implementation starts only after the owner accepts this proposal. Each stage is
a separate commit on the same branch and can be reverted alone. The gate after
every stage: `npm run typecheck`, `npm test`, `node scripts/check-types-policy.mjs`.

## 1. Baseline

- [x] 1.1 Record `npm run verify` on the branch start: bundle size, `dist` asset count, `sw.js` cache id and the Playwright result.
- [x] 1.2 Add `react`, `react-dom`, `@radix-ui/react-dialog`, `@radix-ui/react-label` to dependencies and `tailwindcss`, `@tailwindcss/vite`, `@types/react`, `@types/react-dom` to devDependencies; confirm no other package enters.

## 2. Tailwind and tokens

- [x] 2.1 Wire `@tailwindcss/vite` into the Vite config and add `src/ui/styles/shell.css` importing theme and utilities into explicit layers, with Preflight absent.
- [x] 2.2 Create `src/ui/styles/tokens.css` mapping the `css/app.css` `:root` values into one `@theme` block.
- [x] 2.3 Add a token check: fail on a shell token missing from the source or a changed source value; prove it with negative fixtures.

## 3. React root, router store and legacy bridge

- [x] 3.1 Add `src/ui/main.tsx` and mount it from `index.html`; the shell renders the current path.
- [x] 3.2 Add `src/ui/router.ts` as a subscription over the History API and `popstate`, keeping the same URLs and base path.
- [x] 3.3 Add `src/ui/legacy-bridge.tsx` calling the legacy screen's `mount(root)` and cleanup in a layout effect; verify a route switch in both directions disposes listeners.
- [x] 3.4 Route `/sheet` to the React screen and leave every other route on the bridge; unknown paths still fall back to the table.

## 4. Store hook

- [x] 4.1 Add `src/ui/store/use-game.ts` with `useSyncExternalStore`, a cached snapshot, and no second state copy.
- [x] 4.2 Test that two reads without a change return the same snapshot reference, and that a save failure is observable in the snapshot.

## 5. Shared components

- [x] 5.1 Add Button, Field, RoleToken, PlayerSeat, SaveStatus and OfflineBanner with tokens only and no game-state import.
- [x] 5.2 Add Dialog on Radix with focus in, Escape, focus restore, `aria-modal` and an accessible name.
- [x] 5.3 Add a browser check for the dialog contract and for 390 px usability.

## 6. `/sheet` migration

- [x] 6.1 Port the sheet to React: 72 standard roles, the 5 Travellers in their own section, the scenario filter, the language switch and artwork from the existing catalogs and assets.
- [x] 6.2 Keep catalog loading and the recoverable error state; the screen stays read-only.
- [x] 6.3 Remove the legacy sheet screen from the mount table only after the React route passes the parity check.

## 7. Browser parity check

- [x] 7.1 Extend `scripts/browser-check.mjs`: role counts per language, filter effect, Traveller section, read-only assertion, route switch disposal.
- [x] 7.2 Confirm the legacy routes' computed typography and spacing are unchanged.

## 8. Documentation and gate

- [x] 8.1 Update `AGENTS.md`, `SPEC.md` and `docs/architecture.md` with the shell, the token source and the dependency list.
- [x] 8.2 Run `npm run verify`, `node scripts/openspec-check.mjs` and the Playwright checks; record the bundle and asset deltas.
- [ ] 8.3 Open the pull request, report the checks and wait for the owner.

## Evidence

- RED: the token check fails with a shell token missing from the source, the dialog browser check fails before Radix is wired, and the sheet parity check fails while `/sheet` still renders the legacy DOM.
- GREEN: after each stage, `npm run verify` (typecheck, node tests, build, fallback, offline worker, boundary policy) and the Playwright checks pass; the recorded bundle and asset deltas are reported in the pull request.
- Recorded: baseline JS 428.29 kB / 121.50 kB gzip, CSS 71.43 kB / 13.49 kB gzip, dist 14,202,064 B, 403 assets, cache `c88e844d1ef20dda`; after: JS 650.65 kB / 190.49 kB gzip, CSS 80.87 kB / 15.59 kB gzip, dist 14,433,866 B, 403 assets, cache `2aa6cb49870d2ba7`; 260 unit tests; Playwright checks pass.
