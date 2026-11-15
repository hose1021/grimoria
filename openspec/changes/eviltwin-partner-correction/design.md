# Design

## Source

`docs/official/wiki/Evil_Twin.r3101.wikitext`: "You & an opposing player know
each other." The Storyteller picks the opposing player; the engine cannot infer
it from the bag alone after a Pit-Hag change.

The existing correction command is the host control for adjudicated state. This
change adds one correction kind instead of a second command or a new screen.

## Explicit choice

The engine never derives the opposing twin. `normalizeBag` keeps a legal
`evilTwinGoodId` the host picked in the bag screen and leaves it unset
otherwise, so setup validation (`evil-twin-good`) blocks the deal.
`replaceCharacter` clears both twin player ids when the `eviltwin` character
enters play mid-game, and `evilTwinPair` reads only the stored ids — the old
role-based fallback is gone. A living holder without a stored pair that names it
makes `endNight` return `error.77`; the pair then comes only from the `twin`
correction. Legacy saves without the player-id fields still resolve once at
import, keyed off the fields' absence rather than a null value, so a saved
unchosen pair stays unchosen.

## Validation order

1. A non-empty reason (existing check).
2. A known player.
3. A Sects & Violets script (`error.74`).
4. The player holds the `eviltwin` character (`error.75`).
5. The partner exists, is a different living player (`error.31`, `error.55`).
6. The partner has the opposite real alignment (`error.76`).

Only then does the command write `evilTwinGoodPlayerId`, `evilTwinPlayerId` and
`evilTwinGoodId` (the good twin's role) and add the secret correction log. The
win reads the stored ids, so the pair controls it directly.

## Compatibility

`CorrectionChange` gains one variant. Saved games are unchanged; the new fields
already exist in schema v4. A replay applies the same correction command.

The generic `error.5` remains for a truly unknown correction kind. The new codes
carry their own RU/EN/AZ copy so the table banner explains the refusal.
