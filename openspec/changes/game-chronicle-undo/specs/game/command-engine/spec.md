## ADDED Requirements

### Requirement: Night choice record

Every completed night step SHALL name the chosen players in its log detail. A
step that makes a player drunk SHALL name that player. The record SHALL be
written when the ability is suppressed, and SHALL keep the localized note key.

**Source**: Issue #489; [Sailor r1768](https://wiki.bloodontheclocktower.com/index.php?title=Sailor&oldid=1768), [Innkeeper r3160](https://wiki.bloodontheclocktower.com/index.php?title=Innkeeper&oldid=3160)
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: Sailor choice

- **WHEN** a Sailor chooses a living player and the host makes a player drunk
- **THEN** the completed step's log names the chosen player and the drunk player

#### Scenario: Innkeeper choice

- **WHEN** an Innkeeper chooses two players and the host makes one drunk
- **THEN** the completed step's log names both protected players and the drunk player

#### Scenario: Suppressed choice

- **WHEN** a drunk or poisoned Sailor chooses a player
- **THEN** the log line still names the actor's step and the failure, and no player is called drunk

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
