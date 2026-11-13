# Proposal

## Why

On a phone the app bar wraps seven route links, Help and the language switch into
several rows under the brand. The header then occupies a large part of the
viewport and pushes the screen the host is using down. The route list is only
consulted between phases, so it should cost one tap and no permanent space.

Issue: #141

## What Changes

- Below 900 pixels both app bars replace the inline route list with one menu
  toggle that opens a panel with the seven route links, Help and the language
  switch.
- At 900 pixels and above the same panel renders inline and the toggle does not
  render, so desktop navigation keeps its current behaviour and order.
- The panel closes on Escape, on a press outside it and after a route
  activation. Escape and a route activation return focus to the toggle.
- One shared controller drives both the React bar and the string-composed bar
  used by `/help` and `/demo`; no second menu implementation and no new
  dependency.
- The language control on `/help` and `/demo` is injected into the panel instead
  of the header end.
- No game rule, command, storage key, route or persisted preference changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: adds one requirement for the mobile app bar menu: the toggle,
  the panel content, the close and focus behaviour, the desktop breakpoint and
  parity between the React and string-composed bars.

## Impact

- `src/ui/components/arcane/app-bar-parts.ts`: shared toggle, panel, nav list
  and link classes for the 900 px breakpoint.
- `src/ui/components/arcane/app-bar.tsx` and `app-bar-html.ts`: the toggle and
  the one panel that carries the links, Help and the language control.
- `src/ui/components/arcane/app-bar-menu.ts` (new): the delegated open, close,
  Escape, outside-press and focus controller used by both bars.
- `src/ui/i18n/locales/{ru,en,az}.ts`: one menu label.
- `src/ui/i18n/translate.ts`: the injected language select targets the panel.
- `src/entry/screens/help.ts` and `demo.ts`: bind the menu controller.
- `scripts/browser-check.mjs`: menu behaviour at 390 and 360 pixels, unchanged
  inline navigation at 1440, and existing language-switch steps that must open
  the panel first on a phone viewport.
- `scripts/fixtures/computed-styles.json`: re-recorded for the moved language
  control and the header layout at 390 pixels.
