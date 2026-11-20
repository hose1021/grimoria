# Proposal

Issue: #330

## Why

The notes textarea dispatched `setNotes` on every `onChange`. `setNotes` is not
undoable, but it is journaled and persisted: a 4,000-character note created
thousands of commands, localStorage writes and replay entries, and re-rendered
the table on each keystroke.

## What changes

- The field keeps a local draft and commits it after a 600 ms pause, on blur and
  on unmount.
- A note saved from outside (import, undo) replaces the draft.
- The note still survives a reload once committed.

## What stays

- `setNotes` and its storage key; no schema or command change.
- The journal entry and the undo behaviour.
