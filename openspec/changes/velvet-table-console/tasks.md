# Tasks

## 1. Prerequisite and token foundation

- [ ] 1.1 Prerequisite: after the owner merges and archives `arcane-instrument-ui`, rebase this branch on the resulting `main`, add the `MODIFIED` delta for `app/arcane-visual-system` (the `/table` composition replaces the three-zone console; phone seat names replace the hidden-label rule), and run `openspec validate --changes --strict`.
- [ ] 1.2 Add the table tokens to the one `@theme` block in `css/app.css`: felt day and night, primary, secondary and danger actions, parchment card and ink. Run `node scripts/check-types-policy.mjs` and confirm the token policy fails if one token is removed.
- [ ] 1.3 Add pure table helpers for the seat centres, the label side and anchors, the decreasing seat z-order, the state-badge list and the dawn summary; cover them in `src/ui/screens/table/helpers.test.ts` for 5, 8 and 15 seats and run `node --test src/ui/screens/table/helpers.test.ts`.

## 2. Table ring and state badges

- [ ] 2.1 RED: add browser-check assertions for the table window at 1440, 390 and 360 px: fifteen visible names, the fixed dock, the vertical table scroll, the textual state badges, the threshold, the dawn report and the player card. Run `node scripts/browser-check.mjs`, record the failure in the PR, and do not weaken the assertions.
- [ ] 2.2 Build the seat medallion, name label and state-badge primitives; render role artwork, the name at every width, the inward/above/below label sides, the z-order and a 44x44 keyboard-reachable target.
- [ ] 2.3 Render the fifteen-seat ring with no label collision at 1440, 390 and 360 px; verify the phone names, the seat number in the roster and the focus ring with the new browser assertions.

## 3. Table window and dock

- [ ] 3.1 Recompose `/table` as the app bar, the table stage and the fixed dock; move the phase control into the bar or dock; add the player list and the centre hub; remove the three-zone frame and the duplicate panels without losing notes, timer, undo, import or export.
- [ ] 3.2 Render the step context, active effects, guidance, consequence preview, rejection reason and Storyteller-choice reason in the dock from `tableProjection`, `useTableDrafts` and the existing `preview`/`run` paths; add the prevented-death, Soldier, Mayor-redirect and Saint warnings from the preview result.
- [ ] 3.3 Keep target selection on the seat ring, keep the step draft correction and clear path, and verify the one-next-step rule at 1440 and 390 px with the existing browser assertions.

## 4. Day, threshold and dawn

- [ ] 4.1 Render the day hub with the open nomination, recorded voters, the threshold `ceil(living / 2)` and the execution control; dispatch `nominate`, `recordVotes`, `execute` and `endDay`; show the engine rejection when a command is refused.
- [ ] 4.2 Show the executed player and role after an execution, keep multiple nominations and ghost votes on the engine path, and verify that the execution control is unavailable below the threshold.
- [ ] 4.3 Add the dawn report: the night deaths with names and roles, the survivor count or "nobody died", a dismiss control and the return to the nomination view; verify a night with a death, a night without a death and the next day.

## 5. Full-screen player card

- [ ] 5.1 Add the full-screen player-card dialog: role card, night information and host template; hide the bar, table and dock; move focus inside, close on Escape and return focus to the trigger; never dispatch a command.
- [ ] 5.2 Show the Drunk's believed role and ability, never the Drunk role; for a poisoned or drunk actor, replace the true-information control with the template only; expose the role card from the player list and the information from the step sheet.
- [ ] 5.3 Verify the card at 390 and 1440 px: no console, table, dock, notes or host truth visible; the template text; the poisoned path; the close and focus contract.

## 6. Responsive and accessibility

- [ ] 6.1 Verify the table at 1440, 768, 390, 360 and 320 px: no horizontal overflow, the table scrolls only inside the stage, the bar and dock stay fixed, and no label crosses a seat or the dock.
- [ ] 6.2 Verify 44 px targets, visible focus, accessible names, the state text not relying on colour, the reduced-motion path, the contrast of the felt badges and the card, and the keyboard path through seats, dock and card.

## 7. Verification and delivery

- [ ] 7.1 GREEN: run `node scripts/browser-check.mjs`, `npm run verify`, `node scripts/check-types-policy.mjs` and `node scripts/style-parity.mjs --check`; record the results. Re-record the computed-style baseline if the console intentionally changes.
- [ ] 7.2 Update `SPEC.md` and `docs/design-direction.md` for the table composition, the tokens and the player card; confirm no document still requires the three-zone console or hidden phone names for `/table`; run `openspec validate --changes --strict`.
- [ ] 7.3 Capture the table at 1440, 390 and 360 px and compare it with `design/prototypes/05-velvet-ring.html`; report the differences.
- [ ] 7.4 Commit, push the branch and open the pull request with the RED and GREEN evidence; the owner decides the merge. After the merge, archive the change and remove the worktree and the local branch.

## Evidence

- RED: the new browser-check assertions for the table window fail on the current three-zone console; record the exact command and failure in the pull request before the implementation.
- GREEN: `node scripts/browser-check.mjs`, `npm run verify` and `node scripts/check-types-policy.mjs` pass after the implementation; record the results in the pull request.
