# Secrets as a checksheet

Issue: #284

## Why

`/secrets` is the last setup route that reads as a dashboard. Three rails put
the phase card, the reminder list, three identical pair editors and a readiness
rail on the same plane, so the Storyteller has to scan every editor to find the
one that is not answered. The rail also hardcodes its headings, status words and
step chips in Russian, which the `en` and `az` locales cannot translate. The
same select row appears three times with no visible difference between a pair
that is answered and one that is not.

## What Changes

- Re-compose `/secrets` as a checksheet: an obligations index that carries each
  obligation's answered state, one open obligation in the reading pane, and a
  pinned footer with readiness and one primary action.
- Render a one-of-two answer as the sentence the Storyteller speaks — «Один из
  [игрок] и [игрок] — [персонаж]» — with the three selects inline. The Drunk's
  false pair uses the same sentence with its own tag and hint.
- Move the red herring, the reminder tokens and the roster into obligation
  panes of the same index. The red herring sentence names the good player the
  Fortune Teller sees as a Demon.
- Replace every hardcoded Russian string in the route with a key in `ru`, `en`
  and `az`.
- Put the Bad Moon Rising and Sects & Violets briefing branches on the same page
  head, error band and footer as the checksheet. They keep their read-only facts
  and their start action; they gain no index, because they hold no choices.
- Update `scripts/browser-check.ts`: the phone walkthrough opens each obligation
  through `[data-obligation]` before filling it, and the red herring is filled
  in its own pane.
- No engine, command, projection, route, storage key or state change.

## Capabilities

### New Capabilities

- `app/secrets-setup`: the Storyteller's setup-secrets surface — the obligations
  index, the one-of-two sentence editor, the red herring, the reminder and
  roster checks, readiness and the single start action.

### Modified Capabilities

None.

## Impact

- UI: `src/ui/screens/secrets.tsx` rewritten; `src/ui/i18n/locales/{ru,en,az}.ts`
  gain the setup-secrets keys.
- Regression harness: `scripts/browser-check.ts` fills the checksheet by opening
  each obligation; every existing assertion on the route, the 44 px targets, the
  legal status and the start action stays.
- Untouched: `src/core/`, `src/application/`, `src/entry/store.ts`, routes,
  projections, the shared app bar, the bag and seat screens.
