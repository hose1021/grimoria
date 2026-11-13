# Proposal

## Why

The console's privacy cover earns nothing. The **Скрыть экран** control in the
side panel replaces the whole console with `HideOverlay`: a kicker, the title
"Экран скрыт", the player hand-off warning and one **Продолжить** button. That
button reveals the console again, so anyone holding the device undoes the cover
in one tap, and the card itself paints the console's contents nowhere. The
warning sentence ("На столе ведущего видны секретные роли…") was written for the
device being passed between players, not for the host's own console. The same
overlay also opens automatically after `/player` and `/public`, so the host pays
an extra tap on every return. The owner decided the screen is not needed.

Issue: #150

## What Changes

- Remove the `[data-act="hide"]` control from the console side panel and the
  `HideOverlay` card with its kicker, title, warning and **Продолжить** button.
- Remove the automatic cover: `/table` renders the console immediately after
  `/player` or `/public`.
- Remove the `"hide"` member of the `Overlay` union, the `initialOverlay`
  parameter of `useTableDrafts` and the `COVER` style constant.
- Remove the `covered` plumbing that only served this cover: the `TableScreen`
  prop, the `PRIVATE` map and `previousPath` snapshot field in the shell and
  router, the `LegacyBridge` prop and the `LegacyScreen.mount` options object.
- Remove the `hide` and `ui.screenHidden` strings from the `ru`, `en` and `az`
  catalogs and the unused "Hide screen" / "Screen hidden" entries in the legacy
  translator. `playerWarning` stays: `/player` and `/public` still use it.
- **BREAKING** for the baseline spec: `app/ui-shell` loses the requirement
  "Hidden console after a private route", "Setup routes open without a cover"
  drops the clause that kept the overlay, and a new requirement states that the
  console opens directly.
- Rewrite the `/table` privacy steps of `scripts/browser-check.mjs`, including
  the stale-Escape regression, which used the cover as its setup.
- Update `README.md`, `SPEC.md`, `docs/architecture.md` and
  `docs/improvement-implementation.md`, which still promise a covered return.
- No game rule, command, storage key, route, persisted preference or player
  hand-off behaviour changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: removes "Hidden console after a private route", restates
  "Setup routes open without a cover" without the overlay clause, and adds
  "Console opens directly after a private route".

## Impact

- `src/ui/screens/table/dialogs.tsx`: delete `HideOverlay` and its `Overlays`
  branch; drop the `COVER` import.
- `src/ui/screens/table/drafts.ts`: remove `"hide"` from `Overlay` and the
  `initialOverlay` parameter.
- `src/ui/screens/table/index.tsx`: drop `TableScreenProps.covered`, the
  `"hide"` case of the early return and the comment that names the hide cover.
- `src/ui/screens/table/frame.tsx`: delete the side-panel hide button.
- `src/ui/screens/table/styles.ts`: delete `COVER`.
- `src/ui/shell.tsx`: delete `PRIVATE` and the `covered` computation; stop
  passing `covered` to `TableScreen` and `LegacyBridge`.
- `src/ui/router.ts`: delete `RouteSnapshot.previousPath`, which loses its only
  reader.
- `src/ui/legacy-bridge.tsx` and `src/ui/ports.ts`: delete the `covered` prop
  and the `mount` options object; `/help` and `/demo` already declare
  `mount(root)`.
- `src/ui/i18n/locales/{ru,en,az}.ts` and `src/ui/i18n/translate.ts`: delete
  the four now-unused strings.
- `scripts/browser-check.mjs`: replace the covered-start, reveal and
  stale-Escape steps.
- Documentation and baseline spec: `README.md`, `SPEC.md`,
  `docs/architecture.md`, `docs/improvement-implementation.md`,
  `openspec/specs/app/ui-shell/spec.md`.
