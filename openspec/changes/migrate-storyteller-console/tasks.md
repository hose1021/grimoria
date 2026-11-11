# Tasks

Implementation starts only after the owner accepts this proposal. Each stage is
a separate commit on the same branch and can be reverted alone. The gate after
every stage: `npm run typecheck`, `npm test`, `node scripts/check-types-policy.mjs`.

## 1. Baseline

- [x] 1.1 Record `npm run verify` and `node scripts/browser-check.mjs` on the branch start, plus the computed-style baseline of every element under `#screen` on `/table` at 390 px and 1440 px.
- [x] 1.2 Write `src/ui/screens/table/helpers.test.ts` first: `applyGiven` for every information kind, `timerText` formatting and the correction defaults; run it and record the failure while `helpers.ts` does not exist.

## 2. Ports and route

- [x] 2.1 Add `dispatch(command: CommandInput): DispatchResult` to `ShellPorts.commands`, a `history: { canUndo(): boolean; undo(): boolean }` port and a `guidance: { for(step: NightStep): Guide }` port; wire all three in `src/entry/main.ts` from `js/store.js` and `js/guidance.js`.
- [x] 2.2 Render `/table` as a native screen in `src/ui/shell.tsx` with the `covered` flag and remove `/table` from the legacy `screens` map; keep the unknown-path fallback and the writer gate.

## 3. Shell structure

- [x] 3.1 Add `src/ui/screens/table/helpers.ts` with `stepTitle`, `targetNames`, `causeText`, `headerCount`, `currentPhaseLabel`, `timerText`, `displayName`, `roleOf`, `shownRoleOf`, `applyGiven` and the correction defaults; make `helpers.test.ts` pass.
- [x] 3.2 Add `index.tsx` with the writer gate, `useGame`, the `useTableDrafts` hook, the Escape listener and the composition; add `header.tsx` with the brand, the nav links, undo, export, import and hide.
- [x] 3.3 Add `seat-rail.tsx` (seat rows, role and effect badges, bluffs, herring) and `side-panel.tsx` (queue with progress, last eight log entries, notes through `setNotes`, 5-minute timer, backup controls, storage-error banner).
- [x] 3.4 Add the mobile panels (play, roster, tools) with `aria-pressed` and the dock links; default to play.

## 4. Night card

- [x] 4.1 Add `night-card.tsx`: phase label, step title and actor, progress, the five-part guidance with the persisted `pg.guided` preference.
- [x] 4.2 Add the target picker with the per-step disabled rules, the Mayor redirect select, and the dead-target and impaired warnings.
- [x] 4.3 Add the registration choices, the computed information preview, the given-answer select and the information card; route the Spy to the grimoire overlay.
- [x] 4.4 Add the BMR and S&V outcome block (deaths, role choice, drunk choice, resurrection, Pukka status) and the complete/skip controls with the missing-reason rule; add the pending-Demon-heir card.

## 5. Day card

- [x] 5.1 Add `day-card.tsx`: morning deaths, the `ceil(living / 2)` threshold, the execution select with the survival option, the execution result and the end-day control.
- [x] 5.2 Add the Virgin nomination form, the Slayer, Gossip, Moonchild and Mastermind panels and the custom-script manual winner.

## 6. Cards, dialogs and review

- [x] 6.1 Add `deal-card.tsx` and the setup prompt for the deal, seat and secrets phases.
- [x] 6.2 Add `over-card.tsx` with the winner, the review gate and the review table, and the two-step new game.
- [x] 6.3 Add `dialogs.tsx`: hide, information, grimoire, role card, correction, export and import; keep the Escape close and the export file name.
- [x] 6.4 Add `guided.tsx` if the guidance rows outgrow `night-card.tsx`.

## 7. Styles

- [x] 7.1 Convert every `host-*` element to Tailwind utilities and tokens; keep the legacy class names only as inert hooks and use `!` where an unlayered global wins.
- [x] 7.2 Move the `/help` and `/demo` rules from `css/host.css` into `css/app.css`: every `.help-*` selector (lines around 493–555) and every `.demo-*` selector (lines around 556–600) with their `@media (max-width: 900px)` and `@media (max-width: 640px)` blocks, plus the shared primitives they use (`.host-alert`, `.host-alert.is-error`, `.host-inline`, `.host-panel-head`, `.host-muted`, `.host-log`). Then delete `css/table.css` and `css/host.css` and remove both links from `index.html`.
- [x] 7.3 Convert `src/ui/components/handback-cover.tsx` to Tailwind and drop `host-cover` and `host-cover-box`.

## 8. Cleanup and docs

- [x] 8.1 Delete `js/table.js` and `js/table-dialogs.js`; remove their exports from `js/app.js` and the composition root.
- [x] 8.2 Update `AGENTS.md`, `SPEC.md`, `docs/architecture.md` (shell routes, stylesheets, migration map) and the Tailwind paragraph in the same change.

## 9. Verification

- [x] 9.1 Extend `scripts/browser-check.mjs`: direct link, writer-busy tab, role card, grimoire, information card, correction, export and import round trip, notes, timer, mobile panels, covered start, review gate and route cleanup.
- [x] 9.2 Run the computed-style comparison for `/table` at 390 px and 1440 px and the spacing check for `/demo` and `/help`; report the diff.
- [x] 9.3 Run `npm run verify`, `node scripts/browser-check.mjs`, `node scripts/openspec-check.mjs` and `openspec validate --changes --strict`.
- [x] 9.4 Open the pull request, report the checks and wait for the owner.

## Evidence

- RED: `node scripts/browser-check.mjs` failed on the phone assertions: with
  `css/host.css` still linked, its unlayered `.host-seats { display: grid }`
  beat the `max-[900px]:hidden` utility, so the rail stayed visible; and
  `.host` was still present behind the hide cover because the console rendered
  under the overlay instead of being replaced by it.
- GREEN: `npm run verify` passes (typecheck, oxlint, oxfmt, 255+ tests, build,
  fallback, worker, policy) and `node scripts/browser-check.mjs` passes every
  check, including the new timer, notes, phone-panel and second-tab assertions.
- The step drafts are namespaced by `createdAt` and night number: before that,
  a seeded replacement game inherited the previous targets (the harness caught
  it as a stale Mayor selection).
- Computed-style comparison against `origin/main` at 390 px and 1440 px:
  document height 651 px vs 656 px (390) and 1031 px vs 1054 px (1440). The
  card is 12 px taller from the target grid's 12 px labels (legacy 11.5 px),
  the queue panel is 21 px taller, and `.host-seat-num` reports a clamped
  `border-radius` instead of `50%` (same rendering). Zero-width border colours
  differ where the legacy rule set only `border-bottom`.
