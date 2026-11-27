# Design

## Dismissal paths

The card keeps the three existing dismissal paths: Escape, a hidden document
and a hidden page. Removing the deadline and the Cancel button leaves saving the
name as the only explicit exit, which is the flow the picker hint already
describes. A mistap is undone by Escape on a keyboard or by leaving the page on
a phone.

## State

`seatIndex` alone decides whether the card is open. The removed `remaining`
state, `deadline` ref and interval effect had no other reader, so the screen
holds no timer and needs no cleanup on unmount.

## Tests

`PG_BROWSER_CHECK=player-card` is the focused regression. It installs the
Playwright clock before the reveal, advances 120 seconds of virtual time and
asserts the card is still open; Escape must close it. Against the old screen the
same check fails, so it guards the removed behavior rather than the markup.
