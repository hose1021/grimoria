## ADDED Requirements

### Requirement: Offline recovery respects the installation and host

Workers SHALL preserve other installations’ offline data and serve from the network when a cache read fails. A host who defers an update SHALL be able to continue without the same worker reopening its prompt during a duplicate notification.

**Source**: SPEC.md, offline and version updates
**Tests**: `src/infrastructure/offline/offline-worker.test.ts`, `src/entry/offline.test.ts`

#### Scenario: Sibling installations on one origin

- **WHEN** two installations start on the same build and one updates
- **THEN** the other installation retains its offline shell and assets

#### Scenario: Unavailable cache

- **WHEN** the cache cannot be opened or read but the network is available
- **THEN** navigation and asset requests can still succeed

#### Scenario: A deferred worker is reported again

- **WHEN** the host presses Later while overlapping update checks report the same worker
- **THEN** the host's deferral is respected and a different update remains eligible
