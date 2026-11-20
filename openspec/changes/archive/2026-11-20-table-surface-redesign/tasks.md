# Tasks

## 1. Failing checks first

- [x] 1.1 Add the redesign assertions to `scripts/browser-check.ts`: one rail,
      a felt radial gradient with a glow, squared day and icon controls, the hub
      hero (`5 / 8` with eight dots), no overlapping medallions and no seat at the
      bottom centre. Verify: the check fails on the new assertions before the
      redesign.

## 2. Table tokens

- [x] 2.1 Add `--color-table-chip` and `--color-table-muted`, set the muted
      turquoise primary (`#4BB8AA`) with obsidian ink, the antique gold secondary
      (`#E1B669`), the obsidian rail and felt, and drop the table field and the
      night felt tokens. Verify: `node scripts/check-types-policy.ts` passes and no
      screen references a removed token.

## 3. Stadium geometry

- [x] 3.1 Replace the fixed ellipse with `tableLayout(count, width, height)`:
      two straight sides, two semicircular caps, equal arc spacing, vertical on a
      tall box and horizontal on a wide box, and a half-step offset for even counts
      so no seat owns the bottom centre. Verify: `node --test
  src/ui/screens/table/helpers.test.ts` passes equal-chord and box-fit tests.
- [x] 3.2 Measure the table box with `ResizeObserver` and render the rail and
      felt from the same bounds; add the 6 px gradient rail and the inner felt with
      one static glow. Verify: the rail, felt and seat checks pass at 1440, 390 and 360.
- [x] 3.3 Restyle the seat block and place labels by the contour normal
      (inward on the sides, outward on the caps); keep the text badges and the
      44 px target. Verify: no label/medallion overlap at 5, 8 and 15 players on a
      phone and a desktop.
- [x] 3.4 Promote the hub nomination tally to the hero numeral and draw the
      threshold dots from the recorded values. Verify: `5 / 8`, eight dots, five
      filled, and a numeral at least 1.5× the threshold label.

## 4. Dock

- [x] 4.1 Restyle the dock container, utility chips and the turquoise/gold/red
      actions with 48 px rows and 4 px corners. Verify: the squared-control
      assertions pass and the dock phase, step, preview and rejection assertions
      still pass.

## 5. Integration

- [x] 5.1 Run `npm run verify`.
- [x] 5.2 Smoked `/table` in a real browser at 1440x900, 390x844 and 360x640
      with 5, 8 and 15 players; checked screenshots, console errors, horizontal
      overflow and label collisions.
- [x] 5.3 Run `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict --specs --strict`.
- [x] 5.4 Record RED and GREEN below.

## 6. Global palette

- [x] 6.1 Retune the shared `@theme` tokens to Obsidian & Antique Gold: page
      #0B0F14, panel #141B23, raised #202C38, border #364654, text #F0F3F5, muted
      #A9B9C8, primary #45B8A9 with hover #60D2BF, gold #E2AE65, success #74C69D,
      danger #EF7779, selected #1E3438, disabled #697C8C; alias the table tokens to
      these values. Verify: token policy passes, `npm test` passes, and the browser
      check walks every route and language.
- [x] 6.2 Put the phase in gold in the dock and hub, select a seat with the
      turquoise outline, and make the dock secondary neutral with light text.
- [x] 6.3 Record the palette evidence below.

## 7. Shared component pass

- [x] 7.1 Bag: compact recommended cards (the preview holds the role strip),
      neutral apply buttons and the accent only on the bag already in play.
- [x] 7.2 Secrets: reminders as a card grid with role art, name and tokens;
      success-token completion lines and the readiness block keep one primary.
- [x] 7.3 Seat: grow the circle to `min(760px, 72vh)`, remove the duplicate
      seat number from the medallion, hide the duplicate order list on a phone and
      add the swap hint.
- [x] 7.4 Player: an occupied seat shows a solid edge, the muted number, the
      name and an explicit `Занято` line; an open seat keeps bright text.
- [x] 7.5 Step sheet: one card with a single header (the dialog title stays
      assistive-only), the acting pill, the ability once, the chosen target row and
      the actions inside the card; the hints are collapsed by default. Engine
      checks stay untouched.
- [x] 7.6 Typography and dock structure: navigation 13 px, body 13-14 px,
      captions at least 12 px, buttons 13 px; dock panel surface, separated utility,
      info and action rows, gold warnings and a neutral selection rejection.
- [x] 7.7 Record the screen evidence below.

## Evidence

- RED: `node scripts/browser-check.ts` with the new assertions and the old
  table failed at `1440px: the table renders one felt surface` (`0 !== 1`,
  `scripts/browser-check.ts:1663`).
- GREEN: `node scripts/browser-check.ts` passed all checks, 75.3 s, including
  the rail, felt, squared controls, hero, no-overlap and bottom-centre
  assertions at 1440, 390 and 360.
- GREEN: `npm test` -> 763 tests, 763 pass.
- GREEN: `npm run verify` passed (typecheck, lint, format, tests, build,
  fallback, offline, token policy, official provenance, acceptance, role
  ownership).
- GREEN: the shared `@theme` carries the full Obsidian & Antique Gold palette
  (#0B0E12/#141A21/#1D2630/#32404C/#F3EFE6/#A2AFBF/#4BB8AA/#68D4C4/#E1B669/
  #71CB91/#E36D75); the table tokens alias it, the felt keeps
  `radial-gradient(ellipse at 50% 38%, var(--color-felt-day),
  var(--color-crypt) 72%)`, and no removed token remains.
- GREEN: real browser at 1440x900, 390x844 and 360x640 with 5, 8 and 15
  players: no label or medallion collisions, no seat at the bottom centre, no
  horizontal overflow. At 390 px with the taller night dock the stage scrolls
  (the documented phone behaviour) and the 15-player ring fits without
  scrolling.
- GREEN: `node scripts/browser-check.ts` passed the complete matrix after the
  shared component pass: phone/tablet, night/day, Virgin, routes, privacy,
  reload, cross-tab, languages, role sheet, dialog, offline reload and the
  fast update. The phone night walk selects only missing targets and waits for
  the step sheet; one run failed when a stale PWA update banner covered the
  dock, and the clean rerun passed (pre-existing banner overlay, not a screen
  change).
- GREEN: `npm run verify` passed after the shared component pass (typecheck,
  lint, format, 763 tests, build, offline, token policy, provenance,
  acceptance).
- GREEN: real browser `/bag`, `/secrets`, `/seat`, `/player`, `/table` at 390
  and 1440: compact bag cards with neutral apply buttons and one accent on the
  ready block, reminder cards, a larger seat circle, explicit `Занято` seats,
  and the merged step-sheet header; console clean.
- GREEN: the step sheet at 390 shows one card: actor and role header with the
  acting pill, the ability once, the collapsed host hints, the gold blocker and
  the in-card skip/confirm; after choosing a target it shows `ЦЕЛЬ`,
  `Выбрано: 1`, the name and a check.
- GREEN: `openspec validate --changes --strict` passes for all changes.

## Workflow follow-up

- File the GitHub issue and add its number to `proposal.md` before review.
- Commit, push and open the PR; never merge it.
- Archive the change after the owner merges and the verification passes.
