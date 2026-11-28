# Design

## Decisions

- **Replace the oldest entry.** A bluff list has a fixed size at seven or more
  players. A click while the list is full therefore replaces the oldest entry
  instead of being ignored; repeated picks cycle the list. The host can still
  clear a chosen slot to replace one entry specifically.
- **The eligible pool does not change.** [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168)
  defines Demon info as three good characters not in play, and the Drunk mask
  stays excluded. Only the selection reaction changes.
- **One helper for both lists.** The Demon and Lunatic pickers share the control,
  so `chooseBluff` owns the append-or-replace rule and the screen only sends the
  result.
- **No extra state.** The rule needs no selected-slot or confirmation state; the
  visible slot change is the feedback.

## Risks

- A host may expect a full list to be read-only; the click now changes an entry.
  The slot row reflects the change immediately, and Undo restores the previous
  list.
- The Lunatic list falls back to the Demon list when it is empty. The first pick
  on that fallback writes an explicit Lunatic list, which is the existing
  divergence behavior rather than a new one.
