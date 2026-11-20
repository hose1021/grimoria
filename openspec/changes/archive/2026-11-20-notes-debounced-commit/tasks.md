# Tasks

## 1. Characterization

- [x] 1.1 Read the journal and `setNotes`; a per-keystroke dispatch journals and
      persists each character.
- [x] 1.2 Record RED: F-018 was a source-text assertion; the browser check
      journals one command for 100 characters after the change.

## 2. Console

- [x] 2.1 Add `NotesField` with a local draft, a 600 ms debounce, blur and
      unmount commits.
- [x] 2.2 Sync the draft when the store changes it from outside.

## 3. Tests

- [x] 3.1 Browser `notes-debounce`: ten rapid changes journal at most one
      command, the whole note is stored, and it survives a reload.

## 4. Documents

- [x] 4.1 No schema, storage or command payload change.

## 5. Evidence

- RED: one command per character in the old field.
- GREEN: `PG_BROWSER_CHECK=notes-debounce` passes on 390 px with one journal entry for 100 characters; F-018 passes; `npm test` 1,310 pass.
