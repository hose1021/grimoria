# Proposal

## Why

A private route leaves a hand-back cover in front of the next setup route: after
`/player` or `/public`, `/bag`, `/seat` and `/secrets` stay hidden behind a
"Закройте экран" screen until someone taps "Вернуть устройство ведущему". The
cover states no decision, adds one screen and one tap to every setup walk, and
repeats the hand-back warning that the player screen already shows under the
number picker, under the role card and in its back dialog.

Issue: #142

## What Changes

- Delete `src/ui/components/handback-cover.tsx` and the gate branch in
  `src/ui/shell.tsx`, so `/bag`, `/seat` and `/secrets` render directly after
  `/player` or `/public`.
- Remove the now-unused `playerCover` string from the `ru`, `en` and `az`
  catalogs.
- Update `scripts/browser-check.mjs` to assert the bag screen renders straight
  after `/player` and to drop the `#return-host` activation.
- Update `docs/architecture.md` and the root `AGENTS.md` shell description,
  which still name the removed cover.
- No **BREAKING** change: routes, commands, the saved state and the storage
  format stay the same. The `/table` hide overlay after a private route stays.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: adds the requirement that a setup route opens directly after a
  private route, with no cover screen and no extra confirmation.

## Impact

- Code: `src/ui/shell.tsx`, `src/ui/components/handback-cover.tsx` (deleted),
  `src/ui/i18n/locales/{ru,en,az}.ts`, `scripts/browser-check.mjs`,
  `docs/architecture.md`, `AGENTS.md`.
- Specs: `openspec/specs/app/ui-shell/spec.md` gains one requirement; the
  existing "Hidden console after a private route" requirement keeps the
  `/table` overlay.
- Not affected: the store, the engine, commands, the saved game, the offline
  worker, the player projection and the role sheet.
