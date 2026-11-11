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
  happened", "death prevented" and "player revived". A log line carries the
  stable `consequence` the engine writes at the death, prevention and
  resurrection sites.
- Ending the night or the day shows the engine transition preview; the engine
  remains the authority on whether the transition is allowed. A rejected
  transition uses the same banner.
- A rejected command or a Storyteller-choice outcome renders its engine reason
  in a console banner instead of `window.alert`.
- A step draft can be cleared without applying anything, so a mistaken target
  is corrected locally and the preview recomputes instead of a trigger firing
  twice.
- The three UI catalogs gain the new keys and a parity test covers the keys the
  change uses, including the guidance rows.

No **BREAKING** change: engine rules, command payloads, routes and saved-game
migration stay the same. `LogEntry` gains one optional log metadata field, so an
old save still loads and old lines use the UI fallback.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `app/ui-and-privacy`: adds the storyteller step explanation, preview,
  transition preview, rejection reason, correction and guidance-parity
  requirements.

## Impact

- Code: `src/ui/screens/table/*` (cards, frame, index, drafts, view, helpers),
  `src/ui/ports.ts`, `src/entry/main.ts`, `js/locales/{ru,en,az}.js`, and the
  engine log sites in `src/core/model/types.ts`, `src/core/engine/context.ts`,
  `death.ts`, `day.ts`, `night.ts`, `bmr.ts`.
- Tests: `src/ui/screens/table/helpers.test.ts`, `js/strings.test.mjs`,
  `js/bmr.test.mjs`, `js/engine.test.mjs`, `scripts/browser-check.mjs`.
- No rule behavior, storage format or migration change.
