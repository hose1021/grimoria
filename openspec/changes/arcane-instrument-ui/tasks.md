# Tasks

## 1. Tokens and primitives

- [x] 1.1 Add the Arcane values to the one `@theme` block in `css/app.css`; verify `node scripts/check-types-policy.mjs` exits 0 and fails when one new token is temporarily removed.
- [x] 1.2 Rely on `themeTokens` in `scripts/check-types-policy.mjs`, which derives the pairs from the `@theme` block, including `--shadow-*` and `--radius-*`; verify the token check passes and a renamed token is reported by name.
- [x] 1.3 Add a local `cx` class-join helper under `src/ui/components/`. The drafted `ActionButton` was deleted in review: every screen composes the one `.btn` primitive in `css/app.css`, so a second button wrapper never served a live control.
- [x] 1.4 Add `PlayerToken` with seat, name, role art, alive/dead, votes, effect marks and active/selected states; verify a browser check renders 8 tokens, a struck dead token and a poison mark at 1440 and 390 px.
- [x] 1.5 Add `RoleCard` with hidden, revealed and compact modes, team label, ability and reminder slots; verify the hidden mode renders no role data and the revealed mode renders the ability.
- [x] 1.6 Add `EventLog` with its empty and long-content states and caller-supplied labels; verify `npm run typecheck` and a browser check that the log shows at most eight entries. `PhasePanel` and `GrimoirePanel` were deleted in review for the same reason as 1.3.
- [x] 1.7 Write `docs/design-direction.md` with the material roles, palette table, typography, radii, motion and the two-second read; verify every named token exists in the `@theme` block.

## 2. Shell and console

- [x] 2.1 Replace the console header with the Arcane top bar: brand, route navigation, language switch, clock and hide control; verify every route link resolves and the header does not overflow at 390 px.
- [x] 2.2 Recompose `/table` into the three-zone grid (controls, table, log) with the table as the widest zone; verify a browser check measures the three zones at 1440 and a single-column order at 390.
- [x] 2.3 Render the day panel with nomination, vote threshold, execution and timer, and the night panel with actor, target choice, progress and resolve; verify the unresolved-target and skip-reason checks still pass.
- [x] 2.4 Render the seat ring with tokens, votes, poison, protection, red herring, dead and active states; verify the ring at 5, 8, 11 and 15 players without label collision at 1440, 390 and 360 px.
- [x] 2.5 Move the event log into the right zone and keep notes, timer and backup controls reachable; verify notes persist, export names start with `grimoria-` and a failed save is visible.
- [x] 2.6 Order the phone console table first, then controls and log; verify no horizontal overflow at 360 and 390 px and that every route link stays reachable.
- [x] 2.7 Keep the hidden-console behaviour after `/player` and `/public`, with Escape closing overlays; verify both routes cover the console and reveal only from the reveal control.

## 3. Bag

- [ ] 3.1 RED: add browser-check assertions that the manual picker has no search, edition or team filter and shows four team groups with counts; run the check and record the failure. (The assertions exist in `scripts/browser-check.mjs` and pass; the historical RED was not captured.)
- [x] 3.2 GREEN: remove the manual search, edition and team filter state and controls, and render every role of the selected script under its team heading; verify the new assertions pass.
- [x] 3.3 Restyle the presets, random and manual panels, the selected-role row, bluffs and the deal control in the Arcane frame; verify preset apply, random bag and deal still pass their existing checks.
- [x] 3.4 Keep selection, undo, repair, the library and import/export working after the grouping change; verify each control with the existing browser checks.
- [x] 3.5 Update `SPEC.md` `/bag` text for the grouped manual picker; verify no document still describes the removed filters as required.

## 4. Seats and secrets

- [x] 4.1 Restyle the seat ring with hex tokens, seat numbers, the start marker, the dead state and the order list; verify click swap, drag swap, undo, shuffle and publish-while-editing.
- [x] 4.2 Restyle the secrets screen: pair selectors, Drunk mask, red herring, reminders, roster and readiness; verify the herring write and the start-night gate.
- [x] 4.3 Restyle the Bad Moon Rising and Sects & Violets setup summaries in the same language; verify each script renders its own summary and start control.

## 5. Player, public and sheet

- [x] 5.1 Restyle the player cover and the revealed role card; verify the card shows only the shown role, the 45-second deadline, Escape and the hand-back warning.
- [x] 5.2 Restyle the public projection without exposing hidden roles, notes or effects; verify the privacy assertions and the winner state.
- [x] 5.3 Group `/sheet` by team with a dot, heading and count, and restyle each role as a compact card; verify 72 standard roles, 5 Travellers, the scenario filter and the language switch.

## 6. Help, demo and CSS cutover

- [x] 6.1 Restyle `/help` and `/demo` with utilities and the shared primitives; verify their grids, alerts and responsive layout at 1440 and 390 px before the reset lands.
- [x] 6.2 Enable Preflight and the shell reset in `src/ui/styles/shell.css`; verify every route at 1440, 390 and 360 px after the reset, with no lost list, focus or form styling.
- [x] 6.3 Remove the three stylesheet links from `index.html` and delete `css/bag.css`, `css/seat.css` and `css/setup.css`; update the browser-check selectors that read a deleted rule; verify the full browser-check suite.
- [x] 6.4 Remove the legacy-only tokens, keeping `--text`, `--muted`, `--danger`, `--font-role` and the team colours; verify `node scripts/check-types-policy.mjs` and `npm run build` pass.
- [x] 6.5 Scan the built stylesheets for `host-`, `tbl-`, `bag-`, `seat-`, `setup-`, `help-` and `demo-` rules; verify none remain and the inert hooks still exist in the DOM.

## 7. Integration and documentation

- [x] 7.1 Run `npm run verify`; verify exit 0 including typecheck, lint, format, 480 tests, build, fallback, offline, token policy and acceptance.
- [x] 7.2 Run the browser checks at 1440, 390 and 360 px over the whole phone finale path; verify no horizontal overflow, 44 px controls and the day/night panels.
- [x] 7.3 Update `docs/architecture.md` and `SPEC.md` for the Tailwind-only screens, the new tokens and the deleted stylesheets; verify no stale path or class reference remains.
- [x] 7.4 Capture the six screens at 1440 and 390 px and compare them with `design/prototypes/03-arcane-instrument-full.html`; verify the phase, table, bag groups, seats, secrets, player card and sheet match the direction.

## 8. Interaction and visual polish

- [x] 8.1 Make the table the night target surface: seat tokens expose `data-target` and `data-id`, select or deselect the current step target and show the selected state; the step card lists the chosen names and no longer duplicates the target buttons; verify the night target flows in `scripts/browser-check.mjs`.
- [x] 8.2 Render the ring core as the active role: night number, role, step progress, chose-target prompt and a target chip; verify at 5 and 15 players.
- [x] 8.3 Match the active and selected token to the prototype: dark amber hex fill, gold edge, "Действует"/"Цель" badges and a shape-following glow; verify no rectangular shadow.
- [x] 8.4 App bar polish: one active route outline, the nominative player label, the segmented RU/AZ/EN switch and 44 px targets; remove the fixed footer dock and the offline-ready block.
- [x] 8.5 Bag polish: interactive secret-role tokens, stable source order, selected/required counts at the team headings, compact picked chips and team edges.
- [x] 8.6 Secrets: preserve the chosen information role in the engine, reset the pair on role change, constrain the pair grid, and place the red herring beside the pairs.
- [x] 8.7 Demo: a 15-player seed with generated names on the setup card.
- [x] 8.8 Verify: `npm run verify` and the full `scripts/browser-check.mjs` pass with the target selection on the table.
- [x] 8.9 Select the day execution target on the table; the bottom strip shows the vote count and threshold, the dead count, "Карточка роли" and a crimson "Казнить", keeps "Отменить", and no longer offers "Скрыть экран"; the hide control sits in the side panel. Activating the selected seat again clears it and swaps "Казнить" for "День без казни", which ends the day without an execution.
- [x] 8.10 Do not show a timer in the ring core; the core names the phase, the active role, the step progress and the chosen target.
- [x] 8.11 Move the confirm-target and skip controls from the night card to the bottom strip; skip completes the step without a reason prompt. The payload schema keeps `reason` optional and `skipStep` accepts an empty one, with a command test covering `{ key }`.

## Review fixes

- [x] Skip without a reason through the command contract: `skipStep` keeps an
  optional `reason` in `PAYLOAD_SCHEMA`, the engine accepts an empty one, and
  `commands.test.ts` covers the `{ key }` payload; verify `npm test`.
- [x] An explicit empty information role clears the stored one, and a pair edit
  keeps the chosen role; verify the two `setSetupInfo` tests.
- [x] Size the seat token from the ring geometry (chord per seat count) instead
  of a viewport breakpoint, floor the ring at 420 px below 900 px, and keep a
  44 px target; verify `node scripts/browser-check.mjs` at 640x360.
- [x] Restore `dead` and `threshold` in all three locales, remove the unused
  `cancelNomination` label, and pass every ring, log and offline string through
  `t()`.
- [x] Keep host navigation off `/public`: the bar renders without its route
  list there and the leaving control keeps its confirmation.
- [x] Delete the superseded console components, style constants, helpers and
  button/field/label wrappers; one `.btn` convention remains, and the two app
  bars share `app-bar-parts.ts`.
- [x] Re-record `scripts/fixtures/computed-styles.json` for the Arcane routes;
  verify `node scripts/style-parity.mjs --check` exits 0.
- [x] Move every control and chrome colour out of the primitive rules and
  `index.html` into the `@theme` block, and let the document aliases read the
  Arcane name instead of repeating the value; verify the policy check and the
  unchanged computed-style baseline.
- [x] Delete the components no route rendered after the recomposition (`Dock`,
  `RoleLine`, `Inline`, `HOST_CLASS`) and keep the frame's exports used.

## Evidence

- RED: `node scripts/browser-check.mjs` must fail on the grouped-manual assertions before task 3.2, because the picker still renders search, edition and team filters; record the exact failure in 3.1. Not captured; the assertions now exist and pass.
- GREEN: `node scripts/browser-check.mjs` passed: "Browser checks passed: phone/tablet, night/day, Virgin, route cleanup, privacy, reload, cross-tab, languages, native role sheet, dialog contract, offline project-subpath reload, safe PWA update."
- GREEN: `npm run verify` exited 0: typecheck, lint, format, 480 tests, build, fallback, offline, source policy and acceptance (72 matrix roles, 12 test files).

## Workflow follow-up

- The owner links the GitHub issue before the apply workflow starts.
- Commit, push the branch and open a pull request; the owner decides the merge.
- After the merge, archive the change with `openspec archive` and update the main specs.
