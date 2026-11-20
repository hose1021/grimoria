# Proposal

Issue: #291

## Why

On the owner's 1568x773 screenshot the `/table` setup phase is one 755x246
card pinned under the app bar, four same-size adjacent buttons where only the
first reads as primary, and a blank stage filling the rest of the window. The
roster (eight players waiting for names) is never shown, so the host cannot see
who is still missing from the table without leaving the screen.

## What Changes

- Replace `SetupPrompt` and `DealCard` with one setup board used by every phase
  before the first night (`setup`, `deal`, `seat`). The board is the stage's
  content, not a card in its top corner.
- Add a four-step rail — roles, names, seats, secrets — derived from the saved
  state, with the current step marked by the table primary and completed
  steps marked by a check, not by colour alone.
- Add the roster: one chip per seat in `state.order`, carrying the seat number,
  the claimed name or the unclaimed label, and a claimed/unclaimed mark. Long
  names truncate; the chip is not a control.
- Replace the 7 px progress bar with a small `N / M` count derived from the same
  roster.
- Give each step exactly one primary action in the dock's action style: open
  `/bag` for roles, pass the device to `/player` for names, open `/seat` for
  seats, and start the first night when the secrets are valid. Remaining routes
  and the demo become quiet links with 44 px targets.
- Keep the manual-script warning, the secrets error list, the first-night
  caution and the disabled first-night control with the board, unchanged.
- Add five locale keys for the rail labels, the unclaimed seat and the name
  count in `ru`, `en` and `az`.
- **BREAKING** for visual acceptance only: the setup phase no longer renders a
  single narrow card with four equal-weight buttons.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/table-console`: adds the setup board as the defined `/table` surface for
  the setup, deal and seat phases. Existing ring, dock, hub, player-card and
  command requirements are unchanged.

## Impact

- UI: `src/ui/screens/table/cards.tsx` (`MainCard`, `SetupPrompt`, `DealCard`),
  `src/ui/screens/table/styles.ts` (board and shared action classes).
- Tokens: none added. The board reuses the table tokens
  (`--color-table-rim`, `--color-table-chip`, `--color-table-muted`,
  `--color-table-primary`, `--color-table-primary-ink`) and the Arcane
  `--color-crypt-2` panel surface.
- Locales: `src/ui/i18n/locales/{ru,en,az}.ts`. The existing
  `strings.test.ts` already fails on a missing catalog entry or a parameter
  mismatch, so it needs no edit.
- Regression harness: `scripts/browser-check.ts` gains a setup-board case for
  the roster, the current step, the primary destination and the 360 px fit.
- Documentation: one paragraph in `docs/design-direction.md` under
  Composition.
- Untouched: the engine, state schema, commands, projections, routes, storage
  keys, the app bar, the dock's content, `TableRing`, overlays, `/bag`,
  `/player`, `/seat` and `/secrets`.
