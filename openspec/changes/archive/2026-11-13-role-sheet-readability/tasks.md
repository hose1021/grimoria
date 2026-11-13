# Tasks

## 1. Prove the truncation with a failing check

- [x] 1.1 Add a sheet legibility assertion to `scripts/browser-check.mjs` after the existing sheet checks: switch to the `all` scenario, enable Travellers, then for widths 320, 360, 390, 768, 1280 and 1440 px, evaluate every `.sheet-role` and verify the card's ability text equals `window.PG.roles` for that `data-role-id`, computed `-webkit-line-clamp` is `none`, the card and its ability paragraph have `scrollHeight <= clientHeight + 1`, the name font size is at least 16 px and the ability font size at least 12 px. Verify the check fails on the current build and names the first failing role id and property.
- RED: `node scripts/browser-check.mjs` on the unmodified build fails at 320 px in `sheetLegibility`: `washerwoman: -webkit-line-clamp is 3`, `librarian: ability clips 55>41`, `librarian: ability font size 9.5px`, `librarian: name font size 15px`.

## 2. Make every sheet card show its role in full

- [x] 2.1 In `src/ui/components/arcane/role-card.tsx`, remove `line-clamp-3` from the compact row ability, set the name to `text-base` and the ability to `text-xs` with the existing readable line height, and remove the now-redundant `mt-1` only if the spacing stays unchanged. Verify the new assertion passes at 390 px and 1280 px.
- [x] 2.2 In `src/ui/screens/sheet.tsx`, raise both sheet grids from `minmax(250px,1fr)` to `minmax(320px,1fr)`, keeping the single column below 680 px. Verify the assertion passes at all six widths and the Travellers section keeps one card per grid cell.
- GREEN: `node scripts/browser-check.mjs` passes: `Browser checks passed: ... languages, native role sheet, ...` after the sheet legibility assertions pass for ru, en and az at 320, 360, 390, 768, 1280 and 1440 px.

## 3. Integration verification

- [x] 3.1 Run `npm run typecheck`, `npm run lint` and `npm run format:check`; verify all three exit zero.
- [x] 3.2 Build the test artifact and run `node scripts/style-parity.mjs --check`; verify it passes with `scripts/fixtures/computed-styles.json` unchanged. If a probe moves, record the route, element and property, and re-record the baseline only with the reason written in the pull request. Re-recorded with Playwright 1.65.0: `/sheet/en` document `body.height` and `#screen.height` grew (1280 px 1336.53 -> 1707.86, 390 px 3133.53 -> 3475.88) because the cards no longer clip their abilities; the re-record contains those 4 values only and `--check` then passes.
- [x] 3.3 Run the full `node scripts/browser-check.mjs`; verify the existing sheet assertions still pass: role counts, scenario filter, Travellers section, language switch and reload, read-only game state. Passed with Playwright 1.65.0: `Browser checks passed: ... languages, native role sheet, ...`.
- [x] 3.4 Run `npm test`, `node scripts/openspec-check.mjs` and `openspec validate --changes --strict`; verify all three exit zero and the validation reports no warnings for this change.
- [x] 3.5 Open `/sheet/ru`, `/sheet/en` and `/sheet/az` at 320, 390 and 1440 px with Travellers on, and verify the longest cards (Pit-Hag, Beggar, Evil Twin) render their complete ability with no ellipsis, no page-level horizontal overflow and no console error. Measured all 9 combinations: `-webkit-line-clamp: none`, name `16px`, ability `12px`, not clipped, catalog text complete, zero console errors; screenshots confirm the cards.

## Workflow follow-up

- Commit in this worktree, push `feat/role-sheet-readability` and open the pull request with `Issue: #143` and the change name; do not merge it.
- After the owner merges, remove the worktree and delete the local branch.
- Sync and archive the change once the owner-reviewed merge passes the OpenSpec checks.
