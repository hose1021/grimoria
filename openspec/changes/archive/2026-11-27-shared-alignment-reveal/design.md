# Design

## Context

`projectSeats` is the handoff boundary. It reads the saved players but returns
only what a player may see: id, seat, name, claim and `shownRoleId`. The player
screen renders that projection and never reads `state.players`.

Goon r2977 § How to Run: after the first chooser takes effect, "if this player's
alignment is different from the Goon's alignment ... wake the Goon, give them a
thumbs-up or a thumbs-down (indicating their new alignment), then put the Goon to
sleep." States r1039 § Alignment and Character says the player learns an
alignment or character change at the earliest opportunity, in secret, and that
this learning is not affected by drunkenness, poisoning or the Vortox.

## Decision

Add one field, `shownAlignment`, computed inside `projectSeats`:

- It is `good` or `evil` only when the player's real `roleId` is `goon`; it
  mirrors the stored `team`.
- It is `null` for every other seat, including the Lunatic, whose `shownRoleId`
  is a Demon mask and whose real team is not the mask's team.

The role card label uses `shownAlignment ?? role.team`. The fallback keeps every
other role's printed team exactly as before.

## Why not a new notification state

The Goon's `team` is already the authoritative record and is already persisted
and replayed. A second field would be a second state system. The projection is a
pure function of stored state, so no drunk, poison or Vortox branch can suppress
the reveal.

## Privacy

The projection still exposes no `roleId`, `team`, effect, reminder, bluff or
note. `shownAlignment` does not name the player's real role: it is the same fact
the official thumbs-up/down conveys. The Lunatic and all masked roles remain
`null`.

## Tests

- Unit: Goon good, Goon evil, Lunatic mask, non-Goon, and the key set/privacy
  assertions on the projection.
- Browser: `goon-alignment` builds a legal eight-player BMR game, has a Pukka
  choose the Goon on night one, checks the host journal line, opens `/player`
  and asserts the evil alignment on the role card.
