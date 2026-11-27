## MODIFIED Requirements

### Requirement: Transaction order and publication

An accepted command SHALL be prepared, validated, applied on a draft,
invariant-checked, persisted and only then published. A persist failure SHALL
restore the in-memory game and SHALL never publish the draft. The same rule
SHALL cover `reset`, `replaceState` and `importGame`: a failed write SHALL
restore the game and history before publishing one failed status.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `src/entry/store.test.ts`, `src/core/engine/commands.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Persist failure

- **WHEN** the storage adapter throws during a write
- **THEN** the store returns `persist-failed`, the game equals the last saved
  game and no subscriber observed the draft

#### Scenario: Rejected command

- **WHEN** a command is rejected or needs a Storyteller choice
- **THEN** nothing is written and no snapshot is published

#### Scenario: Accepted command

- **WHEN** a command is accepted and saved
- **THEN** the game revision increases once, the snapshot changes once and every
  listener is notified once

#### Scenario: Replacement persist failure

- **WHEN** `reset`, `replaceState` or `importGame` cannot write because the
  adapter throws or another tab changed the disk
- **THEN** the game and history are restored, one failed status is published,
  and no subscriber observes the replacement state
