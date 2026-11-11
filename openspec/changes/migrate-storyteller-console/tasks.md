# Tasks

Implementation starts only after the owner accepts this proposal. Each stage is
a separate commit on the same branch and can be reverted alone. The gate after
every stage: `npm run typecheck`, `npm test`, `node scripts/check-types-policy.mjs`.

## 1. Baseline

- [ ] 1.1 Record `npm run verify` and `node scripts/browser-check.mjs` on the branch start, plus the computed-style baseline of every element under `#screen` on `/table` at 390 px and 1440 px.
- [ ] 1.2 Write `src/ui/screens/table/helpers.test.ts` first: `applyGiven` for every information kind, `timerText` formatting and the correction defaults; run it and record the failure while `helpers.ts` does not exist.

## 2. Ports and route

- [ ] 2.1 Add `dispatch(command: CommandInput): DispatchResult` to `ShellPorts.commands`, a `history: { canUndo(): boolean; undo(): boolean }` port and a `guidance: { for(step: NightStep): Guide }` port; wire all three in `src/entry/main.ts` from `js/store.js` and `js/guidance.js`.
- [ ] 2.2 Render `/table` as a native screen in `src/ui/shell.tsx` with the `covered` flag and remove `/table` from the legacy `screens` map; keep the unknown-path fallback and the writer gate.

## 3. Shell structure

- [ ] 3.1 Add `src/ui/screens/table/helpers.ts` with `stepTitle`, `targetNames`, `causeText`, `headerCount`, `currentPhaseLabel`, `timerText`, `displayName`, `roleOf`, `shownRoleOf`, `applyGiven` and the correction defaults; make `helpers.test.ts` pass.
- [ ] 3.2 Add `index.tsx` with the writer gate, `useGame`, the `useTableDrafts` hook, the Escape listener and the composition; add `header.tsx` with the brand, the nav links, undo, export, import and hide.
- [ ] 3.3 Add `seat-rail.tsx` (seat rows, role and effect badges, bluffs, herring) and `side-panel.tsx` (queue with progress, last eight log entries, notes through `setNotes`, 5-minute timer, backup controls, storage-error banner).
- [ ] 3.4 Add the mobile panels (play, roster, tools) with `aria-pressed` and the dock links; default to play.

## 4. Night card

- [ ] 4.1 Add `night-card.tsx`: phase label, step title and actor, progress, the five-part guidance with the persisted `pg.guided` preference.
- [ ] 4.2 Add the target picker with the per-step disabled rules, the Mayor redirect select, and the dead-target and impaired warnings.
- [ ] 4.3 Add the registration choices, the computed information preview, the given-answer select and the information card; route the Spy to the grimoire overlay.
- [ ] 4.4 Add the BMR and S&V outcome block (deaths, role choice, drunk choice, resurrection, Pukka status) and the complete/skip controls with the missing-reason rule; add the pending-Demon-heir card.

## 5. Day card

- [ ] 5.1 Add `day-card.tsx`: morning deaths, the `ceil(living / 2)` threshold, the execution select with the survival option, the execution result and the end-day control.
- [ ] 5.2 Add the Virgin nomination form, the Slayer, Gossip, Moonchild and Mastermind panels and the custom-script manual winner.

## 6. Cards, dialogs and review

- [ ] 6.1 Add `deal-card.tsx` and the setup prompt for the deal, seat and secrets phases.
- [ ] 6.2 Add `over-card.tsx` with the winner, the review gate and the review table, and the two-step new game.
- [ ] 6.3 Add `dialogs.tsx`: hide, information, grimoire, role card, correction, export and import; keep the Escape close and the export file name.
- [ ] 6.4 Add `guided.tsx` if the guidance rows outgrow `night-card.tsx`.

## 7. Styles

- [ ] 7.1 Convert every `host-*` element to Tailwind utilities and tokens; keep the legacy class names only as inert hooks and use `!` where an unlayered global wins.
- [ ] 7.2 Move the `/help` and `/demo` rules from `css/host.css` into `css/app.css`: every `.help-*` selector (lines around 493–555) and every `.demo-*` selector (lines around 556–600) with their `@media (max-width: 900px)` and `@media (max-width: 640px)` blocks, plus the shared primitives they use (`.host-alert`, `.host-alert.is-error`, `.host-inline`, `.host-panel-head`, `.host-muted`, `.host-log`). Then delete `css/table.css` and `css/host.css` and remove both links from `index.html`.
- [ ] 7.3 Convert `src/ui/components/handback-cover.tsx` to Tailwind and drop `host-cover` and `host-cover-box`.

## 8. Cleanup and docs

- [ ] 8.1 Delete `js/table.js` and `js/table-dialogs.js`; remove their exports from `js/app.js` and the composition root.
- [ ] 8.2 Update `AGENTS.md`, `SPEC.md`, `docs/architecture.md` (shell routes, stylesheets, migration map) and the Tailwind paragraph in the same change.

## 9. Verification

- [ ] 9.1 Extend `scripts/browser-check.mjs`: direct link, writer-busy tab, role card, grimoire, information card, correction, export and import round trip, notes, timer, mobile panels, covered start, review gate and route cleanup.
- [ ] 9.2 Run the computed-style comparison for `/table` at 390 px and 1440 px and the spacing check for `/demo` and `/help`; report the diff.
- [ ] 9.3 Run `npm run verify`, `node scripts/browser-check.mjs`, `node scripts/openspec-check.mjs` and `openspec validate --changes --strict`.
- [ ] 9.4 Open the pull request, report the checks and wait for the owner.

## Evidence

- RED: `node --test src/ui/screens/table/helpers.test.ts` and
  `node scripts/browser-check.mjs` fail while `js/table.js` still owns the
  screen: the helpers module is absent and the native-console assertions do not
  find the screen.
- GREEN: `npm run verify` and `node scripts/browser-check.mjs` pass with the
  native console, the deleted legacy modules and the deleted stylesheets.
