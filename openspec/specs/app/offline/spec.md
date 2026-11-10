# Offline Worker Specification

## Purpose

Defines how the generated service worker precaches the static app, activates a
new version without breaking a live game, and serves navigation offline.

## Requirements

### Requirement: Versioned precache

The generated worker SHALL precache one versioned asset set whose cache name is
derived from the runtime asset hashes and SHALL include the app shell.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/offline-worker.test.mjs:85`

#### Scenario: Generated cache name

- **WHEN** the worker is built
- **THEN** the cache name matches the versioned pattern and the shell is included

### Requirement: Cache pruning on activation

Activation SHALL delete older generated caches and SHALL keep unrelated caches.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/offline-worker.test.mjs:95`

#### Scenario: Old generated cache

- **WHEN** the new worker activates
- **THEN** the previous `pg-static-` cache is deleted and an unrelated cache remains

### Requirement: Explicit activation

A waiting worker SHALL activate only after an explicit `SKIP_WAITING` message,
and that message SHALL be accepted only after every other open window confirms
its game is saved.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/offline-worker.test.mjs:102`, `js/offline-worker.test.mjs:114`, `js/offline-worker.test.mjs:139`

#### Scenario: Unanswered preflight

- **WHEN** one open window does not answer the save preflight
- **THEN** activation is blocked

#### Scenario: Confirmed update

- **WHEN** every window confirms and the host sends `SKIP_WAITING`
- **THEN** the waiting worker activates

### Requirement: Offline navigation

Navigation SHALL use the cached shell and an asset request SHALL fall back to
the network when it is not cached.

**Source**: `SPEC.md` "Reliability and live-play additions"
**Tests**: `js/offline-worker.test.mjs:159`

#### Scenario: Offline reload

- **WHEN** the browser opens the app path with no network
- **THEN** the cached shell answers the navigation

#### Scenario: Uncached asset

- **WHEN** an asset is not in the cache
- **THEN** the worker requests it from the network
