# Proposal

Issue: #200

## Why

The player handoff is the only surface where a player privately learns their
seat. Goon r2977 § How to Run says the Storyteller wakes the Goon and gives a
thumbs-up or thumbs-down indicating the new alignment after a chooser changes
it. The app already stores the Goon's new `team`, but the handoff projection
carried only `shownRoleId`, so a Goon turned evil still saw the printed Outsider
label. The host journal line is not a player reveal.

## What Changes

- Add `shownAlignment: "good" | "evil" | null` to the `/player` seat projection.
  It is populated only for a player whose real role is the Goon, from the stored
  team; the Lunatic and every other masked role keep `null`.
- Use `shownAlignment` for the role card's team label, falling back to the shown
  role's printed team.
- Add `good` and `evil` team labels to the ru, en and az catalogs.
- Keep every other secret out: the projection still carries no real role,
  notes, effects, bluffs or reminder.
- Add unit tests for Goon good, Goon evil, the Lunatic mask and a non-Goon, and
  a production browser check `goon-alignment` that seeds a legal BMR Goon state,
  turns it evil through a Pukka, asserts the `/player` alignment and keeps the
  `/table` consequence visible.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-and-privacy`: the player handoff projection exposes the Goon's
  revealed alignment in addition to the shown role, while every other seat and
  every other secret stays hidden.

## Impact

- UI: `src/ui/screens/player-projection.ts`, `src/ui/screens/player.tsx`,
  `src/ui/i18n/strings.ts`, `src/ui/i18n/locales/{ru,en,az}.ts`.
- Checks: `src/ui/screens/player-projection.test.ts`,
  `scripts/browser-check.ts` (`goon-alignment`).
- Records: this change and `CHANGELOG.md`.
- Untouched: the engine, state model, commands and storage keys. The stored
  `team` is the single source; no second alignment state is added.
