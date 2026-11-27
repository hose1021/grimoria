# Proposal

Issue: #219

## Why

Evil Twin r3101: "If a good player is turned into an Evil Twin, they are still
a good player, with an evil player becoming their twin." The Pit-Hag path always
chose a good partner. When the changed player was good, both sides of the pair
were good; the stored `evilTwinPlayerId` pointed at a good player and the
execution win could not resolve.

## What Changes

- Pair creation reads the holder's real alignment. A good holder gets an evil
  partner; an evil holder gets a good partner.
- The stored ids always name the good side and the evil side.
- The existing Pit-Hag test now asserts the pinned pairing; a symmetric test
  covers an evil player turned into the Evil Twin.
- The legacy fallback in `evilTwinPair` still resolves older saves.

## Out of Scope

- The "both Twins are the same alignment, the Storyteller chooses a new Twin"
  host choice when no opposite-alignment player is alive. The pair stays null
  and the ability is inert.
- Barber-created third-party holders, reported separately.
