# Tasks

## 1. Baseline and failing checks

- [x] 1.1 Record the baseline in the change worktree: `npm test` (expect 470 pass), `npm run typecheck`, `npm run lint`, `npm run format:check`; paste the observed counts into the pull request.
- [x] 1.2 Add `src/ui/i18n/copy.test.ts` with two scans: every catalog value rejects U+2014, and every literal key from `t("...")` and the strings port under `src/ui` and `src/entry` exists in all three catalogs. Run `node --test src/ui/i18n/copy.test.ts` and record the RED output: the dashed keys per language and the missing `preview` key.
- [x] 1.3 Extend `scripts/browser-check.mjs` with the audit assertions: host destination sets and one-row phone nav, bag support separation, single balance sentence and demo reset, 11 px role labels without clipping, 44 px language segments, and the vertical gap above and below the seat ring and player card. Run `node scripts/browser-check.mjs` and record the RED failures for findings 2, 4, 6, 7, 8 and 9.

## 2. Catalog copy

- [x] 2.1 Rewrite the 17 Russian, 6 English and 7 Azerbaijani dashed strings with a period, comma or colon; keep every placeholder and the meaning. Add the `preview` key in all three catalogs.
- [x] 2.2 Run `node --test src/ui/i18n/copy.test.ts src/ui/i18n/strings.test.ts`; verify the copy scan and the key/parameter parity both pass, and record the GREEN output.

## 3. Shared host navigation

- [x] 3.1 Add `src/ui/screens/host-nav.tsx` with `HOST_ROUTES` (table, bag, seat, secrets, player, public, help, sheet) and `HostNav`: router links, `aria-current="page"`, `data-host-nav`, a 44 px minimum control, a desktop row, and one menu button that lists every destination below 900 px.
- [x] 3.2 Use `HostNav` in `bag.tsx`, `seat.tsx`, `secrets.tsx` and `table/frame.tsx`. Move Script and Saved into a bag action row, keep the seat actions together, and keep console Undo, Export, Import and Hide in a separate `data-host-actions` group.
- [x] 3.3 Delete the legacy `.setup-nav`, `.secrets-nav` and `.seat-actions` rules that lose their last consumer; verify no live selector remains with `grep` and that changing page still keeps the document scroll width at the viewport width.

## 4. Layout and copy defects

- [x] 4.1 Render the bag support summary as separated items (` · `) inside a wrapping row, matching the secrets screen; verify with the RED browser assertion at 1440 and 390.
- [x] 4.2 Remove the duplicate balance sentence on `/bag` and the duplicate reset control on `/demo`; verify one occurrence of each remains.
- [x] 4.3 Raise `.bag-token b` to 11 px, set a 96 px chip width and allow two lines; verify "Девственница" and "Смотритель Воронов" stay fully visible at 390 px.
- [x] 4.4 Center the seat ring and the player handoff card in the available height, keeping bottom safe-area padding; add the `data-seat-stage` and `data-player-stage` hooks the browser check measures.
- [x] 4.5 Give the `/sheet` language segments a 44 px minimum width and verify all three measure at least 44x44 at 390 px.

## 5. Design direction

- [x] 5.1 Add `docs/design-direction.md`: the dark-only reason, the dials ENERGY 1 / RHYTHM 2 / MOTION 1, the green accent meaning, and the role-token and seat-ring motifs. Cite the audit report.

## 6. Documentation and verification

- [x] 6.1 Update `SPEC.md` "Screens" with the shared host navigation and the copy rules the audit now enforces.
- [x] 6.2 Run `npm run verify`; verify typecheck, lint, format check, the full test suite, build, fallback, offline, policy and acceptance pass.
- [x] 6.3 Run `node scripts/browser-check.mjs`; verify every audit assertion and the existing route, dialog and phone checks pass.
- [x] 6.4 Run `node scripts/openspec-check.mjs`, `openspec validate --changes --strict` and `openspec validate --specs --strict`; verify all pass.
- [x] 6.5 Open the pull request, report the CI result and stop for the owner; do not merge.

## Workflow follow-up

- Archive this change only after the owner merges and every check above passes on the merge result.
- Remove the worktree and delete the local branch after the merge.

## Evidence

- Baseline: `npm test` 476 pass; `npm run typecheck`, `npm run lint` and `npm run format:check` clean.
- RED: `node --test src/ui/i18n/copy.test.ts` failed on 29 dashed catalog keys (16 ru, 6 en, 7 az) and on `preview` missing in all three catalogs. `node scripts/browser-check.mjs` failed at the first audit assertion, `screen audit: bag destinations`, because no shared host navigation existed yet.
- GREEN: `node --test src/ui/i18n/copy.test.ts src/ui/i18n/strings.test.ts` 7/7; `node scripts/browser-check.mjs` passed the screen audit (navigation, copy, banner, tokens, targets, composition), both phone walks at 360x640 and 640x360, and the existing route, privacy, dialog and update checks.
- `npm run verify`: typecheck, lint, format check, 478 tests, build, fallback (405 assets), offline worker, source policy and acceptance (72 roles, 12 test files) all pass.
- `node scripts/openspec-check.mjs` passed (19 specs, 3 changes); `openspec validate --changes --strict` passed 3/3; `openspec validate --specs --strict` passed 19/19.
