# Proposal

Issue: #135

## Why

The rendered screens were audited at 1440 and 390 px against the anti-slop
rules (`anti-slop/audit-001-2026-11-12.md`). The visual system passes: dark
table theme, role tokens, the seat ring and the green accent are specific to
this product. The audit found two Hard Gate failures and seven smaller defects:
em dashes in user copy, a status line whose items run together, an untranslated
control label, ragged phone headers, no written design direction, chip labels
that are too small, duplicated copy and controls, undersized language segments
and leftover vertical space.

## What Changes

- Replace the em dash used as sentence punctuation in the Russian, English and
  Azerbaijani UI catalogs with a period, comma or colon. Keep the isolated dash
  only as the empty-value glyph the screens supply themselves.
- Add the missing `preview` key to all three catalogs so the three bag preset
  buttons stop rendering the raw key.
- Render the bag support summary as separated items joined by ` · `, matching
  the secrets screen, and let the row wrap.
- Render one host navigation on `/bag`, `/seat`, `/secrets` and `/table` with
  the same destination set. At phone width it collapses into one menu button:
  the bar stays on one row, and opening the menu lists the same destinations.
  Screen-specific actions move out of the navigation and keep their own row.
- Raise the bag role label to 11 px and let a label fit or wrap without
  clipping.
- Size the `/sheet` language segments to at least 44 px wide.
- Center the seat ring and the player handoff card in the available height so
  the bottom quarter is not empty.
- Remove the duplicated balance sentence on `/bag` and the duplicated reset
  control on `/demo`.
- Add `docs/design-direction.md`: dark-only reason, the three dials, the accent
  meaning and the two identity motifs.

No game rule, state schema, storage key, route, command or player-visible
projection changes.

## Capabilities

### New Capabilities

None. No new capability owns these requirements: every change is a property of
the existing shell or of the existing interface copy.

### Modified Capabilities

- `app/ui-shell`: adds the phone navigation contract, the status-summary
  separation, one-action-per-screen, role-token legibility and vertical
  composition of tall screens.
- `app/ui-and-privacy`: extends the interface string contract from key parity
  to complete key resolution and dash-free catalog copy.

## Impact

- `src/ui/screens/bag.tsx`, `seat.tsx`, `secrets.tsx`, `player.tsx`,
  `sheet.tsx`, `table/frame.tsx`, and a new shared host navigation module.
- `src/ui/i18n/locales/ru.ts`, `en.ts`, `az.ts`, and a new copy test under
  `src/ui/i18n/`.
- `scripts/browser-check.mjs`: phone navigation, status separation, tap
  targets, role labels and duplicate-copy assertions.
- `docs/design-direction.md` (new), `openspec/specs/app/ui-shell/spec.md` and
  `openspec/specs/app/ui-and-privacy/spec.md`.
- Out of scope: a visual restyle, curly apostrophes in the English catalog,
  hardcoded English announcements in the seat screen and any change to game
  behavior.
