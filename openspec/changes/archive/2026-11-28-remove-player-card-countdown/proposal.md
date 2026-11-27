# Proposal

Issue: #337

## Why

The `/player` role card hides itself after 45 seconds. A player who needs longer
to read the ability loses the card mid-read, and the hint below the picker
already tells them to tap only when the screen is covered. The Cancel control
next to Save duplicates the automatic exit and adds a second way to leave the
card without a claim.

## What Changes

- Remove the 45-second deadline, the progress bar and the `Hides in Ns` text
  from `src/ui/screens/player.tsx`.
- Remove the Cancel button from the player card.
- Keep Escape, `visibilitychange` and `pagehide` as dismissal paths.
- Remove the unused `autoHide` and `abandonedClaim` strings from the `ru`, `en`
  and `az` locales.
- Replace the OpenSpec `Role card deadline` requirement with `Role card
  dismissal`, and update `SPEC.md`.

## Impact

No game mechanic, engine command, persistence schema, source pin or dependency
change. The picker still requires a name before it claims a seat, and the
projection still carries only the shown role. The card stays open longer, so a
mistap is undone by Escape or by leaving the page.
