## MODIFIED Requirements

### Requirement: Journal-backed undo and redo

Undo SHALL remove the last undoable journal entry, replay the remaining entries
and persist the result; redo SHALL re-insert the removed entry and replay it; a
remaining entry that no longer applies SHALL stop the operation with
`journal-dependency` and leave the state unchanged. A command that adds no
undoable entry (a record-only command) SHALL NOT discard the redo stack; a
command that adds an undoable entry, or a journal reset, SHALL discard it.

**Source**: Issue #30; [Issue #489](https://github.com/hose1021/grimoria/issues/489); `SPEC.md` "State v4"
**Tests**: `src/application/store/create-game-store.test.ts`, `src/core/engine/commands.test.ts`

#### Scenario: Undo then replay

- **WHEN** the host undoes the last accepted command
- **THEN** the state equals the state before that command and redo restores it

#### Scenario: Dependent entry

- **WHEN** replaying the journal without an entry rejects another recorded entry
- **THEN** the operation returns `journal-dependency` naming that entry and the state is unchanged

#### Scenario: Record-only command keeps redo

- **WHEN** the host undoes a command, then types a note or opens the review
- **THEN** redo still restores the undone command

#### Scenario: Undoable command clears redo

- **WHEN** the host undoes a command and then applies a new undoable command
- **THEN** the redo stack is empty and redo is unavailable

#### Scenario: Undo after the game ends

- **WHEN** the game is over after a winner command and the host undoes it
- **THEN** the previous phase returns and redo restores the winner
