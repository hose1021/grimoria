# Design direction

Source: `anti-slop/audit-001-2026-11-12.md`, issue #135. The audit found the
visual system specific to the product and recorded these decisions so later
work does not drift.

## Reading

Operating console for one Storyteller at a table, in a dim room, with a phone
passed between players.

## Dials

- **ENERGY 1.** The interface stays quiet. The scheme card and the next step
  carry the attention; the chrome recedes.
- **RHYTHM 2.** Setup blocks keep one uniform card rhythm because the host
  compares them. The console breaks it into a seat rail, a phase card and a side
  panel.
- **MOTION 1.** Hover and focus states only. The role card reveal is the single
  exception: it lasts 220 ms and `prefers-reduced-motion` disables it.

## Theme

Dark only. The game runs at night with hidden roles on one shared device; a
light surface raises the chance that a secret is visible from the other side of
the table. The dark surface also matches the printed tokens and role art.

## Accent

Green (`--accent`) marks the control that advances the session or the current
state: Deal, Hide screen, the active scenario, the current route. It never marks
decoration. Verified and storyteller-choice status stay in text.

## Motifs

- **Role token.** Role art above the name in a bordered tile, repeated on the
  bag, the bluffs, the sheet and the console rail. Content, not ornament.
- **Seat ring.** The physical circle of players drawn as a ring on `/seat`,
  with seat numbers in clockwise order. It is the only circular composition.

## Verification

The audit's machine checks live in `scripts/browser-check.mjs`: navigation set
and phone menu, status separation, role label size, tap targets and vertical
composition. Copy checks live in `src/ui/i18n/copy.test.ts`.
