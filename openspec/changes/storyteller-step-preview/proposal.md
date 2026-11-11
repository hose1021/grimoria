# Proposal

Issue: #45
Parent: #19, Stage 4.

## Why

The native console shows a step, its guidance and its target picker, but the
Storyteller cannot see what the engine will do before confirming, cannot tell a
chosen target from an applied effect or a scheduled death from a real one, and
learns about a blocked or rejected command only from a browser alert. Guidance
is loaded per locale but nothing proves the three catalogs still describe the
same step.

## What Changes

- Every night step card explains who wakes, what is allowed, the chosen
  targets, the active effects that touch the step, and the mandatory decisions
  that remain; each remaining decision is listed with its reason.
- The card previews the command with the engine's `previewCommand`: the preview
  separates "target chosen", "state applied", "death scheduled", "death
  happened", "death prevented" and "player revived". The side-panel log line
  carries the same category for saved entries.
- Ending the night or the day is blocked while a mandatory decision is open
  (a Demon heir, unfinished night steps, an open nomination). The blocking card
  names the reason and the end button is disabled. The transition preview is
  shown before the button.
- A rejected command or a Storyteller-choice outcome renders its engine reason
  in a console banner instead of `window.alert`.
- A step draft can be cleared without applying anything, so a mistaken target
  is corrected locally and the preview recomputes instead of a trigger firing
  twice.
- The three UI catalogs gain the new keys and a parity test covers the keys the
  change uses, including the guidance rows.

No **BREAKING** change: engine rules, command payloads, saved state and routes
stay the same.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `app/ui-and-privacy`: adds the storyteller step explanation, preview,
  transition blocking, rejection reason, correction and guidance-parity
  requirements.

## Impact

- Code: `src/ui/screens/table/*` (cards, frame, index, drafts, view, helpers),
  `src/ui/ports.ts`, `src/entry/main.ts`, `js/locales/{ru,en,az}.js`.
- Tests: `src/ui/screens/table/helpers.test.ts`, `js/strings.test.mjs`,
  `scripts/browser-check.mjs`.
- No engine, rules, storage or migration change.
