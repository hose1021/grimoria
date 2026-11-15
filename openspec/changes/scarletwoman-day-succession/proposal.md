# Proposal

Issue: #217

## Why

Scarlet Woman r3117, How to Run: "If the Demon dies and there were five or more
alive players immediately before the Demon died, replace the Scarlet Woman
token with a spare Imp token… That night, wake the new Imp, show them the YOU
ARE info token, then show them the Imp token." Imp r3116 says the same.

The engine set `state.night.demonChanged` on any succession and appended the
`demonchange` step only while the same night was open. A Demon executed during
the day set the flag, but `endDay` replaced the night and cleared it, so the new
Demon was never woken. The night self-kill path was correct.

## What Changes

- `endDay` carries the Demon-change flag into the next night.
- When the flag is set, `endDay` appends the conditional steps after building
  the queue, then clears the flag. The existing `demonchange` step shows the
  new Demon the YOU ARE token.
- One new test covers the daytime execution path; the night path and the
  self-kill path keep their existing tests.

## Out of Scope

- The identity of the Demon that the heir becomes. Trouble Brewing has one
  Demon; the mixed-edition question stays out of scope.
- The `demonchange` note text, UI control or journal format.
- Any other succession source.
