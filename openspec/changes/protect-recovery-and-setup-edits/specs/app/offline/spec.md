## ADDED Requirements

### Requirement: Direct Pages routes survive storage denial

The Pages fallback SHALL restore the requested local path, query and fragment even when session storage rejects access.

**Source**: SPEC.md, offline and static hosting
**Tests**: `src/infrastructure/routing/history-router.test.ts`

#### Scenario: Direct link with storage unavailable

- **WHEN** a reference link is opened under a Pages subpath and writing the redirect to session storage fails
- **THEN** boot restores the requested local destination with its query and fragment

### Requirement: A waiting update is available during a slow check

An already installed worker SHALL be handled before the opening network check completes.

**Source**: SPEC.md, update behavior
**Tests**: `src/entry/offline.test.ts`

#### Scenario: A worker is waiting and the network stalls

- **WHEN** the app opens with a waiting worker and its network update check stalls
- **THEN** an active game's host can apply the existing update after a successful save and an idle window can apply it automatically
