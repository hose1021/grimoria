## ADDED Requirements

### Requirement: Keep the only recoverable copy of damaged data

The store SHALL preserve unreadable primary bytes until a recovery copy is successfully stored.

**Source**: SPEC.md, State v4 and corrupt save recovery
**Tests**: `src/application/store/create-game-store.test.ts`

#### Scenario: Backup storage is full

- **WHEN** saving a broken primary under the backup key fails and a smaller replacement would fit
- **THEN** the original remains intact, the error remains visible and the host can retry after freeing space

### Requirement: History controls observe committed history

The store SHALL expose the new undo and redo availability when it publishes a successful history operation.

**Source**: SPEC.md, undo and redo
**Tests**: `src/application/store/create-game-store.test.ts`

#### Scenario: Immediate observation

- **WHEN** a subscriber reads history during an undo or redo notification
- **THEN** the controls reflect the committed operation and failed writes preserve the previous history
