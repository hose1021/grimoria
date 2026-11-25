# Record the game chronicle and keep redo across the whole game

Issue: #489

The night log records the prompt, but not what the host actually chose: a
completed Sailor or Innkeeper step logs no target and no drunk recipient, and
the game-over review shows only the player table. The side panel is the only
place where the narrative log can be read, and only the last entries.

Undo and redo already replay the journal, but a record-only command (`setNotes`,
`setReviewOpen`, `normalizeSecrets`) clears redo, so opening the review or
typing a note after stepping back destroys the forward step. The history port
also reports the store result object as truth, so a failed undo closes the
overlay as if it succeeded.

This change records the actor, the chosen players and the chosen drunk recipient
on every completed night step, shows the complete log in the game-over review,
and keeps redo until a command actually adds an undoable history entry.

Out of scope: game rules, the journal format, the command set, effect
expiry bookkeeping beyond the step that applies it.
