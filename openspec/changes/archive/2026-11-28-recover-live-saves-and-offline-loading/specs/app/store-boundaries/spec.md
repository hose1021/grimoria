## ADDED Requirements

### Requirement: Recovery preserves playable sessions and distinct originals

The store SHALL retain a running game when the primary save becomes unreadable and SHALL accept a subsequent valid repair in an unedited window. Reopening the same damaged bytes SHALL reuse their recovery copy and distinct damaged values SHALL remain independently recoverable.

**Source**: SPEC.md, persistence and cross-tab recovery
**Tests**: `src/infrastructure/adapters.test.ts`, `src/application/store/create-game-store.test.ts`, `src/entry/store.test.ts`

#### Scenario: Damage then repair from a second window

- **WHEN** the primary becomes invalid while a playable game is open
- **THEN** the host can still export the playable game and a clean window can adopt a valid repair

#### Scenario: Repeated recovery

- **WHEN** the damaged save is opened repeatedly or two distinct recoveries share a timestamp
- **THEN** identical bytes share a backup and different originals remain available
