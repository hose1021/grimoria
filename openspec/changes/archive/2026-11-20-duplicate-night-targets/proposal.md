# Proposal

Issue: #316

## Why

Every character that chooses more than one player names distinct seats: the
Innkeeper chooses "2 players" (r3160), the Shabaloth "2 players" (r1790), the
Po up to "3 players" (r3104), the Barber swaps "2 players" (r1757), and the
Fortuneteller and Chambermaid choose two players. `completeStep` checked only
the target count for Bad Moon Rising and Sects & Violets steps, so
`["3","3"]` completed an Innkeeper or Shabaloth step and an equal Barber pair
silently did nothing. The same player cannot be two players.

## What changes

- One shared validation in `completeStep` rejects a repeated seat for every
  step that takes more than one target, with `error.42` before any mutation.
- The Fortune Teller's own duplicate check and the Seamstress's duplicate
  check are removed because the shared rule now covers them; their self-target
  and count checks stay.
- The `error.42` text becomes script-neutral in Russian, English and
  Azerbaijani, because the same code now answers a three-target Po step.

## Out of scope

- Target legality that is not about duplicates: alive targets, self-target
  exclusions, the Exorcist's previous target and the Chambermaid's registered
  living rule stay as they are.
- The recorded journal of an old game: a repeated pair was never a legal
  command, so no saved legal command changes meaning.
