# Tasks

## 1. Visual system

- [x] 1.1 Add the issue-linked delta and a focused visual token contract check; record RED evidence.
- [x] 1.2 Align shared legacy and native tokens with the requested midnight-blue and cyan palette.
- [x] 1.3 Refine shared surfaces, buttons, fields, navigation, status chips, focus and reduced-motion styling.
- [x] 1.4 Apply the visual system across the table, setup, secrets, role sheet, player and public screens through shared tokens.

## 2. Artwork

- [ ] 2.1 Generate and add the low-contrast panoramic moonlit village backdrop.
- [ ] 2.2 Generate and add the three scenario illustrations.
- [ ] 2.3 Generate and add a reusable transparent architectural silhouette sheet.
- [ ] 2.4 Integrate the artwork with responsive crops and a readable dark overlay.

## 3. Verification and delivery

- [x] 3.1 Record GREEN evidence for focused and repository checks.
- [x] 3.2 Inspect table, setup and sheet at 1440px and 390px; check keyboard focus and reduced motion.
- [ ] 3.3 Commit, push and open a pull request; stop for the owner.

## Evidence

- RED: `node --test js/ui-theme.test.mjs` — 1 failing assertion, legacy palette still began with `--bg: #0c0f11` instead of `#071017`.
- GREEN: `node --test js/ui-theme.test.mjs` — 1 passing; `node scripts/check-types-policy.mjs` — passed; `npm run typecheck`, `npm run lint`, `npm test` (261 tests), script tests (47 tests), `node scripts/check-toolchain.mjs`, `node scripts/openspec-check.mjs`, `openspec validate --changes --strict`, `npm run format:check`, `npm run build`, `npm run fallback`, `npm run offline`, and `node scripts/browser-check.mjs` — passed. The browser check regenerated night/day, privacy, route, mobile and update-flow screenshots.
- VISUAL: reviewed 1440px setup, table and role sheet screenshots plus 390px setup/table views; dialog keyboard focus and reduced-motion CSS remain intact.
- IMAGE: built-in image generation returned `403 Forbidden`; CLI/API fallback was not used because the image skill requires an explicit user choice first.
