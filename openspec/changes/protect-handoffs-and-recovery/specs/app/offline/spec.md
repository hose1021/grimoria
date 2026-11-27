## ADDED Requirements

### Requirement: Consistent release precaching

The installer SHALL revalidate mutable release resources and precache only artwork used by playable characters and sheet Travellers.

**Source**: SPEC.md offline deployment
**Tests**: `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Release changes while shell is fresh

- **WHEN** an earlier release is still fresh in the HTTP cache when a newer worker installs
- **THEN** the installed shell and the JavaScript it references belong to the new release

#### Scenario: Asset selection

- **WHEN** the catalog includes unsupported characters
- **THEN** their otherwise unused artwork is absent from the offline download
